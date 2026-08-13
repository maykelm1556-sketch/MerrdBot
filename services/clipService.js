const { spawn } = require("child_process");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const Clip = require("../models/Clip");
const { parsearComandoClip } = require("./clipParser");

function obtenerDuracionVideo(rutaVideo) {

    return new Promise((resolve, reject) => {

        const args = [
            "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            rutaVideo
        ];

        const proceso = spawn("ffprobe", args);

        let salida = "";
        let errorSalida = "";

        proceso.stdout.on("data", (dato) => {
            salida += dato.toString();
        });

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                const duracion = parseFloat(salida.trim());
                if (isNaN(duracion)) {
                    reject(new Error(`ffprobe no devolvió una duración válida: "${salida.trim()}"`));
                } else {
                    resolve(duracion);
                }
            } else {
                reject(new Error(`ffprobe terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar ffprobe: ${error.message}`));
        });

    });

}

function cortarClip(rutaEntrada, inicioSegundos, duracionSegundos, rutaSalida) {

    return new Promise((resolve, reject) => {

        const args = [
            "-ss", String(inicioSegundos),
            "-i", rutaEntrada,
            "-t", String(duracionSegundos),
            "-c", "copy",
            "-y",
            rutaSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaSalida });
            } else {
                reject(new Error(`FFmpeg terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg: ${error.message}`));
        });

    });

}

function generarMiniatura(rutaVideo, rutaSalida) {

    return new Promise((resolve, reject) => {

        const args = [
            "-i", rutaVideo,
            "-ss", "00:00:00.5",
            "-vframes", "1",
            "-y",
            rutaSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaSalida });
            } else {
                reject(new Error(`FFmpeg (miniatura) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (miniatura): ${error.message}`));
        });

    });

}

function generarVersionVertical(rutaVideo, rutaSalida) {

    return new Promise((resolve, reject) => {

        const args = [
            "-i", rutaVideo,
            "-vf", "scale=1080:-2,pad=1080:1920:(1080-iw)/2:(1920-ih)/2:black",
            "-c:a", "copy",
            "-y",
            rutaSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaSalida });
            } else {
                reject(new Error(`FFmpeg (vertical) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (vertical): ${error.message}`));
        });

    });

}

function generarVersionVerticalPersonalizada(rutaVideo, rutaSalida, { zoom, offsetX, offsetY }) {

    return new Promise((resolve, reject) => {

      const factor = zoom / 100;
        const anchoEscalado = Math.round(1080 * factor);

        const posX = `(iw-1080)/2+${Math.round(offsetX)}`;
        const posY = `(ih-1920)/2+${Math.round(offsetY)}`;

        const filtro = `scale=${anchoEscalado}:-2,pad=max(iw\\,1080):max(ih\\,1920):(ow-iw)/2:(oh-ih)/2:black,crop=1080:1920:${posX}:${posY}`;
        const args = [
            "-i", rutaVideo,
            "-vf", filtro,
            "-c:a", "copy",
            "-y",
            rutaSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaSalida });
            } else {
                reject(new Error(`FFmpeg (vertical personalizada) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (vertical personalizada): ${error.message}`));
        });

    });

}

function generarVersionVerticalFondoDifuminado(rutaVideo, rutaSalida) {

    return new Promise((resolve, reject) => {

   const filtro = "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=40:20,setsar=1[fondo];[0:v]scale=1080:-2,setsar=1[frente];[fondo][frente]overlay=(W-w)/2:(H-h)/2,setsar=1";

        const args = [
            "-i", rutaVideo,
            "-filter_complex", filtro,
            "-c:a", "copy",
            "-y",
            rutaSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaSalida });
            } else {
                reject(new Error(`FFmpeg (fondo difuminado) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (fondo difuminado): ${error.message}`));
        });

    });

}

function generarVersionCamaraJuego(rutaVideo, rutaSalida) {

    return new Promise((resolve, reject) => {

        const camX = 0;
        const camY = 580;
        const camAncho = 845;
        const camAlto = 500;

        const filtro =
            `[0:v]crop=${camAncho}:${camAlto}:${camX}:${camY},scale=1080:960[camara];` +
            `[0:v]crop=iw:ih-${camAlto}:0:0,scale=1080:960[juego];` +
            `[camara][juego]vstack=inputs=2`;

        const args = [
            "-i", rutaVideo,
            "-filter_complex", filtro,
            "-c:a", "copy",
            "-y",
            rutaSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaSalida });
            } else {
                reject(new Error(`FFmpeg (cámara+juego) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (cámara+juego): ${error.message}`));
        });

    });

}

function escaparTextoParaDrawtext(texto) {

    return texto
        .replace(/\\/g, "\\\\\\\\")
        .replace(/:/g, "\\:")
        .replace(/'/g, "\u2019")
        .replace(/%/g, "\\%");

}

function obtenerRutaFuente(textoFuente) {

    const valor = (textoFuente || "").toLowerCase();

    if (valor.includes("trebuchet")) return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
    if (valor.includes("georgia")) return "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf";
    if (valor.includes("courier")) return "/usr/share/fonts/truetype/liberation/LiberationMono-Bold.ttf";
    if (valor.includes("impact")) return "/usr/share/fonts/truetype/custom/Anton-Regular.ttf";
    if (valor.includes("verdana")) return "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";
    if (valor.includes("comic")) return "/usr/share/fonts/truetype/custom/ComicNeue-Bold.ttf";

    return "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf";

}

function quemarTextoOverlay(rutaVideoEntrada, rutaVideoSalida, { texto, fuente, tamano, color }) {

    return new Promise((resolve, reject) => {

        if (!texto || texto.trim() === "") {
            fs.copyFileSync(rutaVideoEntrada, rutaVideoSalida);
            resolve({ ok: true, rutaSalida: rutaVideoSalida });
            return;
        }

        const rutaFuente = obtenerRutaFuente(fuente);
        const textoEscapado = escaparTextoParaDrawtext(texto);
        const tamanoFinal = tamano || 32;
        const colorFinal = color || "#ffffff";

        const filtro = `drawtext=text='${textoEscapado}':fontfile=${rutaFuente}:fontsize=${tamanoFinal}:fontcolor=${colorFinal}:x=(w-text_w)/2:y=60:box=1:boxcolor=black@0.4:boxborderw=10`;

        const args = [
            "-i", rutaVideoEntrada,
            "-vf", filtro,
            "-c:a", "copy",
            "-preset", "veryfast",
            "-y", rutaVideoSalida
        ];

        const proceso = spawn("ffmpeg", args);

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaVideoSalida });
            } else {
                reject(new Error(`FFmpeg (texto overlay) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (texto overlay): ${error.message}`));
        });

    });

}

function convertirClipAUrlsAbsolutas(clipDoc) {

    const clip = clipDoc.toObject ? clipDoc.toObject() : clipDoc;
    const base = process.env.CLIP_BASE_URL || "";

    return {
        ...clip,
        miniatura: clip.miniatura ? base + clip.miniatura : clip.miniatura,
        rutaVideo: clip.rutaVideo ? base + clip.rutaVideo : clip.rutaVideo,
        rutaVideoVertical: clip.rutaVideoVertical ? base + clip.rutaVideoVertical : clip.rutaVideoVertical
    };

}

const RUTA_MODELO_WHISPER = path.join(__dirname, "..", "whisper-models", "ggml-small.bin");

function generarSubtitulos(rutaVideo, rutaSrtSalida) {

    return new Promise((resolve, reject) => {

        const carpeta = path.dirname(rutaSrtSalida);
        const modeloRelativo = path.relative(carpeta, RUTA_MODELO_WHISPER).split(path.sep).join("/");
        const srtRelativo = path.basename(rutaSrtSalida);

        const filtro = `whisper=model=${modeloRelativo}:language=es:queue=3:destination=${srtRelativo}:format=srt`;

        const args = ["-i", rutaVideo, "-vn", "-af", filtro, "-f", "null", "-"];

        const proceso = spawn("ffmpeg", args, { cwd: carpeta });

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSrt: rutaSrtSalida });
            } else {
                reject(new Error(`FFmpeg (whisper) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (whisper): ${error.message}`));
        });

    });

}

function quemarSubtitulos(rutaVideoEntrada, rutaSrt, rutaVideoSalida, marginV) {

    return new Promise((resolve, reject) => {

        const carpeta = path.dirname(rutaSrt);
        const srtRelativo = path.basename(rutaSrt);
        const margenReal = marginV !== undefined ? marginV : 40;
      const estilo = `FontName=Arial\\,FontSize=14\\,PrimaryColour=&H00FFFFFF\\,OutlineColour=&H00000000\\,BorderStyle=1\\,Outline=2\\,Shadow=0\\,Bold=1\\,Alignment=2\\,MarginV=${margenReal}`;

        const args = [
            "-i", rutaVideoEntrada,
            "-vf", `subtitles=${srtRelativo}:force_style='${estilo}'`,
            "-c:a", "copy",
            "-preset", "veryfast",
            "-y", rutaVideoSalida
        ];

        const proceso = spawn("ffmpeg", args, { cwd: carpeta });

        let errorSalida = "";

        proceso.stderr.on("data", (dato) => {
            errorSalida += dato.toString();
        });

        proceso.on("close", (codigo) => {
            if (codigo === 0) {
                resolve({ ok: true, rutaSalida: rutaVideoSalida });
            } else {
                reject(new Error(`FFmpeg (quemar subtítulos) terminó con código ${codigo}: ${errorSalida.slice(-500)}`));
            }
        });

        proceso.on("error", (error) => {
            reject(new Error(`No se pudo ejecutar FFmpeg (quemar subtítulos): ${error.message}`));
        });

    });

}

async function procesarComandoClip({ streamer, usuarioCreador, argumentoTexto, rutaGrabacion, io }) {

    const parseo = parsearComandoClip(argumentoTexto);

    if (!parseo.valido) {
        return { valido: false, error: parseo.error };
    }

    const duracionTotal = await obtenerDuracionVideo(rutaGrabacion);

    let inicioSegundos = duracionTotal - parseo.segundosAtras;
    if (inicioSegundos < 0) inicioSegundos = 0;

    const duracionSegundos = Math.min(parseo.segundosAtras, duracionTotal);

    const idUnico = crypto.randomBytes(6).toString("hex");
    const carpetaClips = path.join(__dirname, "..", "public", "clips");

    const nombreMp4 = `clip_${idUnico}.mp4`;
    const nombreVertical = `clip_${idUnico}_vertical.mp4`;
    const nombreMiniatura = `clip_${idUnico}.jpg`;

    const rutaMp4 = path.join(carpetaClips, nombreMp4);
    const rutaVertical = path.join(carpetaClips, nombreVertical);
    const rutaMiniatura = path.join(carpetaClips, nombreMiniatura);

    await cortarClip(rutaGrabacion, inicioSegundos, duracionSegundos, rutaMp4);
    await generarMiniatura(rutaMp4, rutaMiniatura);
    await generarVersionVertical(rutaMp4, rutaVertical);

   try {

        const rutaSrt = path.join(carpetaClips, `${nombreVertical.replace(".mp4", "")}.srt`);
        const rutaVerticalConSubs = path.join(carpetaClips, `clip_${idUnico}_vertical_subs.mp4`);

      await generarSubtitulos(rutaVertical, rutaSrt);
        await quemarSubtitulos(rutaVertical, rutaSrt, rutaVerticalConSubs, 40);

        fs.unlinkSync(rutaVertical);
        fs.renameSync(rutaVerticalConSubs, rutaVertical);

    } catch (error) {
        console.log("No se pudieron generar subtítulos, el clip queda sin subtítulos:", error.message);
    }

    const nuevoClip = new Clip({
        streamer: streamer,
        usuarioCreador: usuarioCreador,
        titulo: `Clip de ${usuarioCreador}`,
        duracionSegundos: duracionSegundos,
        miniatura: `/clips/${nombreMiniatura}`,
        rutaVideo: `/clips/${nombreMp4}`,
        rutaVideoVertical: `/clips/${nombreVertical}`,
        estado: "Editado"
    });

    await nuevoClip.save();

    if (io) {
        io.emit("clip-nuevo", convertirClipAUrlsAbsolutas(nuevoClip));
    }

    return { valido: true, clip: nuevoClip };

}

async function recortarClipExistente({ clipId, inicioSegundos, duracionSegundos }) {

    const clip = await Clip.findById(clipId);

    if (!clip) {
        return { valido: false, error: "Clip no encontrado." };
    }

    const carpetaClips = path.join(__dirname, "..", "public", "clips");
    const rutaMp4Actual = path.join(__dirname, "..", "public", clip.rutaVideo);

    const duracionActual = await obtenerDuracionVideo(rutaMp4Actual);

    if (inicioSegundos < 0 || inicioSegundos >= duracionActual) {
        return { valido: false, error: `El inicio debe estar entre 0 y ${Math.floor(duracionActual)} segundos.` };
    }

    const duracionFinal = Math.min(duracionSegundos, duracionActual - inicioSegundos);

    if (duracionFinal < 1) {
        return { valido: false, error: "La duración resultante es demasiado corta." };
    }

    const idTemp = crypto.randomBytes(4).toString("hex");
    const rutaTemp = path.join(carpetaClips, `temp_${idTemp}.mp4`);

    await cortarClip(rutaMp4Actual, inicioSegundos, duracionFinal, rutaTemp);

fs.unlinkSync(rutaMp4Actual);
    fs.renameSync(rutaTemp, rutaMp4Actual);

    const rutaMiniaturaActual = path.join(__dirname, "..", "public", clip.miniatura);
    const rutaVerticalActual = path.join(__dirname, "..", "public", clip.rutaVideoVertical);

    await generarMiniatura(rutaMp4Actual, rutaMiniaturaActual);
    await generarVersionVertical(rutaMp4Actual, rutaVerticalActual);

    try {

      const nombreBase = path.basename(clip.rutaVideoVertical, ".mp4");
        const rutaSrt = path.join(carpetaClips, `${nombreBase}.srt`);
        const rutaVerticalConSubs = path.join(carpetaClips, `${nombreBase}_subs.mp4`);

      await generarSubtitulos(rutaVerticalActual, rutaSrt);
        await quemarSubtitulos(rutaVerticalActual, rutaSrt, rutaVerticalConSubs, clip.subtituloMarginV);

        fs.unlinkSync(rutaVerticalActual);
        fs.renameSync(rutaVerticalConSubs, rutaVerticalActual);

    } catch (error) {
        console.log("No se pudieron regenerar subtítulos tras recortar:", error.message);
    }

    clip.duracionSegundos = Math.round(duracionFinal);
    await clip.save();

    return { valido: true, clip: clip };

}
module.exports = { cortarClip, generarMiniatura, generarVersionVertical, generarVersionVerticalPersonalizada, generarVersionVerticalFondoDifuminado, generarVersionCamaraJuego, procesarComandoClip, recortarClipExistente, generarSubtitulos, quemarSubtitulos, quemarTextoOverlay, convertirClipAUrlsAbsolutas };