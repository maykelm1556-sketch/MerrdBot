const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CARPETA_GRABACIONES = path.join(__dirname, "..", "recordings");

if (!fs.existsSync(CARPETA_GRABACIONES)) {
    fs.mkdirSync(CARPETA_GRABACIONES, { recursive: true });
}

let procesoActual = null;
let streamDestino = null;
let grabacionActiva = false;
let rutaArchivoActual = null;
function obtenerPlaybackUrl(slug) {

    return new Promise((resolve, reject) => {

        const args = [
            "-s",
            "-H", "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "-H", "Accept: application/json",
            `https://kick.com/api/v2/channels/${slug}`
        ];

        const proceso = spawn("curl", args);

        let salida = "";
        let errorSalida = "";

        proceso.stdout.on("data", (dato) => {
            salida += dato.toString();
        });

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {

            if (codigo !== 0) {
                reject(new Error(`curl terminó con código ${codigo}: ${errorSalida.slice(-300)}`));
                return;
            }

            try {

                const datos = JSON.parse(salida);

                if (!datos.playback_url) {
                    reject(new Error("La respuesta de Kick no trae playback_url (¿canal offline o bloqueado?)."));
                    return;
                }

                resolve(datos.playback_url);

            } catch (error) {
                reject(new Error(`No se pudo parsear la respuesta de Kick: ${error.message} | inicio de respuesta: ${salida.slice(0, 200)}`));
            }

        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar curl: ${error.message}`));
        });

    });

}

function lanzarFfmpegHaciaArchivo(playbackUrl) {

    const args = [
        "-i", playbackUrl,
        "-c", "copy",
        "-f", "mpegts",
        "pipe:1"
    ];

    return spawn("ffmpeg", args);

}

async function intentarConectarYGrabar(slug) {

    while (grabacionActiva) {

        try {

            const playbackUrl = await obtenerPlaybackUrl(slug);

            console.log("Grabación: URL de playback obtenida, iniciando FFmpeg...");

            const proceso = lanzarFfmpegHaciaArchivo(playbackUrl);
            procesoActual = proceso;

            proceso.stdout.pipe(streamDestino, { end: false });

            proceso.stderr.on("data", () => {
                // silenciado a propósito: FFmpeg imprime mucho ruido normal de HLS
            });

            await new Promise((resolve) => {
                proceso.on("close", (codigo) => {
                    console.log("Grabación: FFmpeg terminó con código", codigo, "- reintentando si sigue en vivo...");
                    resolve();
                });
                proceso.on("error", (error) => {
                    console.log("Grabación: error de proceso FFmpeg:", error.message);
                    resolve();
                });
            });

        } catch (error) {
            console.log("Grabación: error obteniendo URL o grabando:", error.message);
        }

        if (grabacionActiva) {
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

    }

}

function iniciarGrabacion(slug) {

    if (grabacionActiva) {
        console.log("Grabación: ya hay una grabación activa, se ignora el pedido de iniciar de nuevo.");
        return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const carpetaStreamer = path.join(CARPETA_GRABACIONES, slug);

    if (!fs.existsSync(carpetaStreamer)) {
        fs.mkdirSync(carpetaStreamer, { recursive: true });
    }

    rutaArchivoActual = path.join(carpetaStreamer, `${timestamp}.ts`);
    streamDestino = fs.createWriteStream(rutaArchivoActual, { flags: "a" });
    streamDestino.on("error", (error) => {
        console.log("Grabación: error escribiendo al archivo:", error.message);
    });

    grabacionActiva = true;

    console.log("Grabación: iniciando grabación en", rutaArchivoActual);

    intentarConectarYGrabar(slug);

}

function detenerGrabacion() {

    if (!grabacionActiva) return;

    console.log("Grabación: deteniendo grabación.");

    grabacionActiva = false;

    if (procesoActual) {
        procesoActual.kill("SIGKILL");
        procesoActual = null;
    }

    if (streamDestino) {
        streamDestino.end();
        streamDestino = null;
    }

}

function obtenerRutaGrabacionActual() {
    return rutaArchivoActual;
}

function grabacionEnCurso() {
    return grabacionActiva;
}

module.exports = { iniciarGrabacion, detenerGrabacion, obtenerRutaGrabacionActual, grabacionEnCurso };