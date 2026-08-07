const express = require("express");
const WebSocket = require("ws");
const crypto = require("crypto");
require("dotenv").config();
const ROL = process.env.ROL || "panel";
console.log(`Iniciando MerrdBot en modo: ${ROL}`);
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET));
mongoose.set("bufferTimeoutMS", 30000);
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Conectado a MongoDB ✅"))
    .catch((error) => console.error("Error al conectar a MongoDB ❌", error));

const economiaSchema = new mongoose.Schema({
    usuario: String,
    puntos: Number
});

const Usuario = mongoose.model("Usuario", economiaSchema);

const kickAuthSchema = new mongoose.Schema({
    access_token: String,
    refresh_token: String,
    expires_in: Number,
    scope: String,
    creado_en: Date
});

const KickAuth = mongoose.model("KickAuth", kickAuthSchema);

const comunidadSchema = new mongoose.Schema({
    usuario: String,
    mensajes: Number,
    puntos: {
        type: Number,
        default: 0
    },
    xp: {
        type: Number,
        default: 0
    },
    nivel: {
        type: Number,
        default: 1
    },
    watchtime: {
        type: Number,
        default: 0
    },
    ultimaActividad: Date
});
const sugerenciaSchema = new mongoose.Schema({
    texto: String,
    fecha: { type: Date, default: Date.now }
});

const Sugerencia = mongoose.model("Sugerencia", sugerenciaSchema);

const colaSchema = new mongoose.Schema({
    videoId: String,
    titulo: String,
    pedidoPor: String,
    agregado_en: { type: Date, default: Date.now }
});

const Cola = mongoose.model("Cola", colaSchema);

const clipsRouter = require("./routes/clips");
app.use("/api/clips", clipsRouter);

app.get("/clips/:archivo", async (req, res) => {

    const archivo = req.params.archivo;
    const urlAws = `${process.env.AWS_INTERNAL_URL}/clips/${archivo}`;

    try {

        const respuestaAws = await fetch(urlAws);

        if (!respuestaAws.ok) {
            res.status(404).send("Archivo no encontrado.");
            return;
        }

        res.set("Content-Type", respuestaAws.headers.get("content-type") || "application/octet-stream");
        respuestaAws.body.pipe ? respuestaAws.body.pipe(res) : res.send(Buffer.from(await respuestaAws.arrayBuffer()));

    } catch (error) {
        console.log("Error en proxy de clips:", error.message);
        res.status(500).send("Error obteniendo el archivo.");
    }

});

const { procesarComandoClip } = require("./services/clipService");
const { iniciarGrabacion, detenerGrabacion, obtenerRutaGrabacionActual, grabacionEnCurso } = require("./services/recordingService");

const comandoAutoSchema = new mongoose.Schema({
    destino: { type: String, unique: true },
    comando: String,
    activo: { type: Boolean, default: false }
});

const ComandoAuto = mongoose.model("ComandoAuto", comandoAutoSchema);

let comandoAutoSorteos = { comando: "", activo: false };
let comandoAutoRuleta = { comando: "", activo: false };

async function cargarComandosAuto() {

    const configSorteos = await ComandoAuto.findOne({ destino: "sorteos" });
    if (configSorteos) {
        comandoAutoSorteos = { comando: configSorteos.comando, activo: configSorteos.activo };
    }

    const configRuleta = await ComandoAuto.findOne({ destino: "ruleta" });
    if (configRuleta) {
        comandoAutoRuleta = { comando: configRuleta.comando, activo: configRuleta.activo };
    }

}

cargarComandosAuto();

app.get("/api/comando-auto/:destino", (req, res) => {

    const destino = req.params.destino;

    if (destino !== "sorteos" && destino !== "ruleta") {
        res.status(400).json({ error: "Destino inválido." });
        return;
    }

    res.json(destino === "sorteos" ? comandoAutoSorteos : comandoAutoRuleta);

});

app.post("/api/comando-auto/:destino", async (req, res) => {

    const destino = req.params.destino;
    const comando = (req.body.comando || "").trim().toLowerCase();
    const activo = !!req.body.activo;

    if (destino !== "sorteos" && destino !== "ruleta") {
        res.status(400).json({ error: "Destino inválido." });
        return;
    }

    await ComandoAuto.findOneAndUpdate(
        { destino: destino },
        { destino: destino, comando: comando, activo: activo },
        { upsert: true }
    );

    if (destino === "sorteos") {
        comandoAutoSorteos = { comando: comando, activo: activo };
    } else {
        comandoAutoRuleta = { comando: comando, activo: activo };
    }

    res.json({ ok: true, comando: comando, activo: activo });

});

let participantesPendientesSorteo = [];
let participantesPendientesRuleta = [];

app.get("/api/sorteos/pendientes", (req, res) => {
    const pendientes = participantesPendientesSorteo;
    participantesPendientesSorteo = [];
    res.json(pendientes);
});

app.get("/api/ruleta/pendientes", (req, res) => {
    const pendientes = participantesPendientesRuleta;
    participantesPendientesRuleta = [];
    res.json(pendientes);
});

let comandosMusicaPendientes = [];

app.get("/api/musica/control-pendientes", (req, res) => {
    const pendientes = comandosMusicaPendientes;
    comandosMusicaPendientes = [];
    res.json(pendientes);
});

app.post("/api/sugerencias", async (req, res) => {

    const texto = req.body.texto;

    if (!texto || texto.trim() === "") {
        res.status(400).json({ error: "Escribe algo antes de enviar." });
        return;
    }

    const nuevaSugerencia = new Sugerencia({ texto: texto.trim() });
    await nuevaSugerencia.save();

    res.json({ ok: true });

});

app.get("/api/sugerencias", async (req, res) => {

    const sugerencias = await Sugerencia.find().sort({ fecha: -1 });
    res.json(sugerencias);

});

app.delete("/api/sugerencias/:id", async (req, res) => {

    const id = req.params.id;

    await Sugerencia.findByIdAndDelete(id);

    const sugerencias = await Sugerencia.find().sort({ fecha: -1 });
    res.json(sugerencias);

});
const Comunidad = mongoose.model("Comunidad", comunidadSchema);

const adminSchema = new mongoose.Schema({
    usuario: String,
    password: String,
    usuarioKick: String,
    creado_en: Date,
    esDefault: { type: Boolean, default: false },
    activo: { type: Boolean, default: true }
});

const Admin = mongoose.model("Admin", adminSchema);
async function crearAdminPorDefecto() {

    const existente = await Admin.findOne({ usuario: { $regex: /^maykel$/i } });

    if (!existente) {
        const nuevoAdmin = new Admin({
            usuario: "Maykel",
            password: "12345",
            creado_en: new Date(),
            esDefault: true,
            activo: true
        });
        await nuevoAdmin.save();
        console.log("Admin por defecto creado (Maykel) ✅");
    } else if (!existente.esDefault) {
        existente.esDefault = true;
        existente.activo = true;
        await existente.save();
        console.log("Admin Maykel marcado como default ✅");
    }

}

crearAdminPorDefecto();

async function registrarActividad(usuario) {

    const existente = await Comunidad.findOne({ usuario: usuario });

   if (existente) {
       existente.mensajes += 1;
existente.puntos += 10;
existente.xp += 5;
existente.watchtime += 1;
existente.ultimaActividad = new Date();

if (existente.xp >= 100) {
    existente.nivel += 1;
    existente.xp -= 100;
}

await existente.save();
    } else {
        const nuevo = new Comunidad({
    usuario: usuario,
    mensajes: 1,
    puntos: 10,
    xp: 5,
    nivel: 1,
    watchtime: 1,
    ultimaActividad: new Date()
});
        await nuevo.save();
    }

}

let codeVerifierGuardado = "";
let ultimoCodeProcesado = "";

function generarCodeVerifier() {
    return crypto.randomBytes(32).toString("base64url");
}

function generarCodeChallenge(verifier) {
    return crypto.createHash("sha256").update(verifier).digest("base64url");
}

app.get("/auth/kick", (req, res) => {

    const codeVerifier = generarCodeVerifier();
    codeVerifierGuardado = codeVerifier;

    const codeChallenge = generarCodeChallenge(codeVerifier);

    const parametros = new URLSearchParams({
        response_type: "code",
        client_id: process.env.KICK_CLIENT_ID,
        redirect_uri: process.env.KICK_REDIRECT_URI,
        scope: "user:read channel:read chat:write events:subscribe",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: "merrdbot"
    });

res.redirect(`https://id.kick.com/oauth/authorize?${parametros.toString()}`);

});

app.get("/auth/kick/viewer", (req, res) => {

    const codeVerifier = generarCodeVerifier();
    const codeChallenge = generarCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    res.cookie("kick_viewer_verifier", codeVerifier, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: "lax"
    });

    res.cookie("kick_viewer_state", state, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: "lax"
    });

    const parametros = new URLSearchParams({
        response_type: "code",
        client_id: process.env.KICK_CLIENT_ID,
        redirect_uri: process.env.KICK_VIEWER_REDIRECT_URI,
        scope: "user:read",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state
    });

    res.redirect(`https://id.kick.com/oauth/authorize?${parametros.toString()}`);

});

app.get("/auth/kick/viewer/callback", async (req, res) => {

  console.log("Query completa recibida en callback viewer:", JSON.stringify(req.query));

    const code = req.query.code;
    const stateRecibido = req.query.state;

    const verifierGuardado = req.cookies.kick_viewer_verifier;
    const stateGuardado = req.cookies.kick_viewer_state;

    res.clearCookie("kick_viewer_verifier");
    res.clearCookie("kick_viewer_state");

    if (!code || !verifierGuardado || !stateGuardado || stateRecibido !== stateGuardado) {
        console.log("Fallo validación viewer OAuth. code:", !!code, "| verifier:", !!verifierGuardado, "| state coincide:", stateRecibido === stateGuardado);
        res.redirect("/?viewer_error=1");
        return;
    }

    try {

        const respuestaToken = await fetch("https://id.kick.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.KICK_CLIENT_ID.trim(),
                client_secret: process.env.KICK_CLIENT_SECRET.trim(),
                redirect_uri: process.env.KICK_VIEWER_REDIRECT_URI.trim(),
                code_verifier: verifierGuardado,
                code: code
            })
        });

        const datosToken = await respuestaToken.json();

        console.log("Respuesta de token para viewer:", datosToken);

        if (!datosToken.access_token) {
            res.redirect("/?viewer_error=1");
            return;
        }

        const respuestaUser = await fetch("https://api.kick.com/public/v1/users", {
            headers: { "Authorization": `Bearer ${datosToken.access_token}` }
        });

      const datosUser = await respuestaUser.json();

        const infoUsuario = datosUser.data && datosUser.data[0];

        if (!infoUsuario || !infoUsuario.name) {
            console.log("No se pudo obtener el username del viewer:", datosUser);
            res.redirect("/?viewer_error=1");
            return;
        }

        res.cookie("viewer_session", infoUsuario.name, {
            httpOnly: true,
            signed: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: "lax"
        });

        res.redirect("/");

    } catch (error) {
        console.log("Error en callback del viewer:", error.message);
        res.redirect("/?viewer_error=1");
    }

});

app.get("/auth/kick/viewer", (req, res) => {

    const codeVerifier = generarCodeVerifier();
    const codeChallenge = generarCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    res.cookie("kick_viewer_verifier", codeVerifier, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: "lax"
    });

    res.cookie("kick_viewer_state", state, {
        httpOnly: true,
        maxAge: 5 * 60 * 1000,
        sameSite: "lax"
    });

    const parametros = new URLSearchParams({
        response_type: "code",
        client_id: process.env.KICK_CLIENT_ID,
        redirect_uri: process.env.KICK_VIEWER_REDIRECT_URI,
        scope: "user:read",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state: state
    });

    res.redirect(`https://id.kick.com/oauth/authorize?${parametros.toString()}`);

});

app.get("/api/viewer/me", async (req, res) => {

    const username = req.signedCookies.viewer_session;

    if (!username) {
        res.status(401).json({ error: "No hay sesión de viewer activa." });
        return;
    }

    const datos = await Comunidad.findOne({ usuario: { $regex: `^${username}$`, $options: "i" } });

    if (!datos) {
        res.json({
            usuario: username,
            puntos: 0,
            nivel: 1,
            watchtime: 0,
            sinDatos: true
        });
        return;
    }

    res.json({
        usuario: datos.usuario,
        puntos: datos.puntos,
        nivel: datos.nivel,
        watchtime: datos.watchtime
    });

});

app.post("/auth/kick/viewer/logout", (req, res) => {
    res.clearCookie("viewer_session");
    res.json({ ok: true });
});

app.get("/auth/kick/callback", async (req, res) => {

    const code = req.query.code;

    if (!code) {
        res.send("No se recibió el código de autorización.");
        return;
    }

    if (code === ultimoCodeProcesado) {
        res.send("Autorización ya completada anteriormente. Puedes cerrar esta pestaña.");
        return;
    }

    ultimoCodeProcesado = code;

    try {

      console.log("Longitud de KICK_CLIENT_ID:", process.env.KICK_CLIENT_ID.length);
        console.log("Longitud de KICK_CLIENT_SECRET:", process.env.KICK_CLIENT_SECRET.length);
        console.log("KICK_REDIRECT_URI usado:", JSON.stringify(process.env.KICK_REDIRECT_URI));

        const respuesta = await fetch("https://id.kick.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.KICK_CLIENT_ID.trim(),
                client_secret: process.env.KICK_CLIENT_SECRET.trim(),
                redirect_uri: process.env.KICK_REDIRECT_URI.trim(),
                code_verifier: codeVerifierGuardado,
                code: code
            })
        });
        const textoCrudo = await respuesta.text();

        const datos = JSON.parse(textoCrudo);

        console.log("Datos completos recibidos de Kick al autorizar:", datos);

        await KickAuth.deleteMany({});

        const nuevoAuth = new KickAuth({
            access_token: datos.access_token,
            refresh_token: datos.refresh_token,
            expires_in: datos.expires_in,
            scope: datos.scope,
            creado_en: new Date()
        });

        await nuevoAuth.save();

        console.log("Token de Kick guardado en la base de datos ✅");
        console.log("Scope que se guardó realmente:", nuevoAuth.scope);

        res.send("Autorización completada y guardada. Ya puedes cerrar esta pestaña.");

    } catch (error) {
        console.log("Error al intercambiar el código:", error.message);
        res.send("Ocurrió un error al completar la autorización.");
    }

});

const KICK_SLUG = "eloviedo";

let canalEnVivo = false;

async function obtenerAccessTokenValido() {

    let auth = await KickAuth.findOne();

    if (!auth) {
        return null;
    }

    const minutosDesdeCreacion = (Date.now() - new Date(auth.creado_en).getTime()) / 60000;
    const minutosDeVida = auth.expires_in / 60;

    if (minutosDesdeCreacion >= minutosDeVida - 10) {

        const authRenovado = await renovarTokenKick(auth);

        if (!authRenovado) {
            return null;
        }

        auth = authRenovado;
    }

    return auth.access_token;

}

async function verificarEnVivo() {

    try {

        const accessToken = await obtenerAccessTokenValido();

        if (!accessToken) {
            console.log("No hay token de Kick guardado/valido. Conecta con Kick desde el panel Admin.");
            canalEnVivo = false;
            return;
        }

        const respuesta = await fetch(`https://api.kick.com/public/v1/channels?slug=${KICK_SLUG}`, {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        });

        console.log("Status consulta en vivo:", respuesta.status);

        const datos = await respuesta.json();

       const canal = datos.data && datos.data[0];

        const estabaEnVivo = canalEnVivo;

        canalEnVivo = !!(canal && canal.stream && canal.stream.is_live);

        console.log("canalEnVivo actualizado a:", canalEnVivo);
        console.log("DIAGNOSTICO_STREAM_OBJETO:", JSON.stringify(canal && canal.stream));
if (ROL === "grabacion") {

            if (canalEnVivo && !estabaEnVivo) {
                console.log("Canal pasó a EN VIVO, iniciando grabación...");
                iniciarGrabacion(KICK_SLUG);
            }

            if (!canalEnVivo && estabaEnVivo) {
                console.log("Canal pasó a offline, deteniendo grabación...");
                detenerGrabacion();
            }

        }

    } catch (error) {
        console.error("Error consultando estado de Kick:", error.message);
        canalEnVivo = false;
    }

}

verificarEnVivo();
setInterval(verificarEnVivo, 20000);
app.get("/api/estado-vivo", (req, res) => {
    res.json({ enVivo: canalEnVivo });
});


const configPuntosSchema = new mongoose.Schema({
    clave: { type: String, unique: true },
    puntosPorMinuto: { type: Number, default: 1 },
    xpPorMinuto: { type: Number, default: 1 }
});

const ConfigPuntos = mongoose.model("ConfigPuntos", configPuntosSchema);

let configWatchtime = { puntosPorMinuto: 1, xpPorMinuto: 1 };

async function cargarConfigWatchtime() {

    const existente = await ConfigPuntos.findOne({ clave: "watchtime" });

    if (existente) {
        configWatchtime = { puntosPorMinuto: existente.puntosPorMinuto, xpPorMinuto: existente.xpPorMinuto };
    } else {
        const nueva = new ConfigPuntos({ clave: "watchtime", puntosPorMinuto: 1, xpPorMinuto: 1 });
        await nueva.save();
    }

}

cargarConfigWatchtime();

app.get("/api/config-watchtime", (req, res) => {
    res.json(configWatchtime);
});

app.post("/api/config-watchtime", async (req, res) => {

    const puntosPorMinuto = parseInt(req.body.puntosPorMinuto);
    const xpPorMinuto = parseInt(req.body.xpPorMinuto);

    if (isNaN(puntosPorMinuto) || isNaN(xpPorMinuto)) {
        res.status(400).json({ error: "Valores inválidos." });
        return;
    }

    await ConfigPuntos.findOneAndUpdate(
        { clave: "watchtime" },
        { clave: "watchtime", puntosPorMinuto: puntosPorMinuto, xpPorMinuto: xpPorMinuto },
        { upsert: true }
    );

    configWatchtime = { puntosPorMinuto: puntosPorMinuto, xpPorMinuto: xpPorMinuto };

    res.json(configWatchtime);

});

async function sumarPorTiempoEnVivo() {

    if (!canalEnVivo) return;

    const limite = new Date(Date.now() - 15 * 60000);

    const usuariosActivos = await Comunidad.find({ ultimaActividad: { $gte: limite } });

for (const usuario of usuariosActivos) {

        usuario.watchtime += 1;
        usuario.puntos += configWatchtime.puntosPorMinuto;
        usuario.xp += configWatchtime.xpPorMinuto;

        if (usuario.xp >= 100) {
            usuario.nivel += 1;
            usuario.xp -= 100;
        }

        await usuario.save();

    }

}

if (ROL === "panel") {
    setInterval(sumarPorTiempoEnVivo, 60000);
}

app.post("/api/musica/agregar", async (req, res) => {

    const videoId = req.body.videoId;
    const titulo = req.body.titulo;
    const pedidoPor = req.body.pedidoPor || "Admin";

    if (!videoId || !titulo) {
        res.status(400).json({ error: "Falta videoId o título." });
        return;
    }

    const nuevaCancion = new Cola({
        videoId: videoId,
        titulo: titulo,
        pedidoPor: pedidoPor
    });

    await nuevaCancion.save();

    const cola = await Cola.find().sort({ agregado_en: 1 });
    res.json(cola);

});

app.get("/api/musica/cola", async (req, res) => {

    const cola = await Cola.find().sort({ agregado_en: 1 });
    res.json(cola);

});

app.delete("/api/musica/cola/:id", async (req, res) => {

    const id = req.params.id;

    await Cola.findByIdAndDelete(id);

    const cola = await Cola.find().sort({ agregado_en: 1 });
    res.json(cola);

});

app.get("/api/musica/buscar", async (req, res) => {

    const q = req.query.q;

    if (!q || q.trim() === "") {
        res.status(400).json({ error: "Falta el término de búsqueda." });
        return;
    }

  try {

        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(q)}&key=${process.env.YOUTUBE_API_KEY}`;

        console.log("URL de YouTube que se va a consultar:", url);
        console.log("YOUTUBE_API_KEY cargada, longitud:", process.env.YOUTUBE_API_KEY ? process.env.YOUTUBE_API_KEY.length : "undefined");

        const respuesta = await fetch(url);
        const datos = await respuesta.json();

        if (datos.error) {
            console.log("Error de YouTube API:", datos.error);
            res.status(500).json({ error: "Error consultando YouTube." });
            return;
        }

        const resultados = datos.items.map(item => ({
            videoId: item.id.videoId,
            titulo: item.snippet.title,
            canal: item.snippet.channelTitle,
            miniatura: item.snippet.thumbnails.default.url
        }));

        res.json(resultados);

    } catch (error) {
        console.log("Error buscando en YouTube:", error.message, "| causa:", error.cause);
        res.status(500).json({ error: "Error interno buscando en YouTube." });
    }

});
const PUSHER_WS_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false";

async function renovarTokenKick(auth) {

    const respuesta = await fetch("https://id.kick.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: process.env.KICK_CLIENT_ID,
            client_secret: process.env.KICK_CLIENT_SECRET,
            refresh_token: auth.refresh_token
        })
    });

    const textoCrudo = await respuesta.text();
    const datos = JSON.parse(textoCrudo);

    if (!datos.access_token) {
        console.log("No se pudo renovar el token de Kick:", textoCrudo);
        return null;
    }

    auth.access_token = datos.access_token;
    auth.refresh_token = datos.refresh_token;
    auth.expires_in = datos.expires_in;
    auth.creado_en = new Date();

    await auth.save();

    console.log("Token de Kick renovado automáticamente ✅");

    return auth;

}

async function enviarMensajeChat(texto) {

    let auth = await KickAuth.findOne();

    if (!auth) {
        console.log("No hay token de Kick guardado. No se pudo enviar el mensaje.");
        return;
    }

    const minutosDesdeCreacion = (Date.now() - new Date(auth.creado_en).getTime()) / 60000;
    const minutosDeVida = auth.expires_in / 60;

    if (minutosDesdeCreacion >= minutosDeVida - 10) {

        console.log("Token de Kick por vencer, renovando...");
        const authRenovado = await renovarTokenKick(auth);

        if (!authRenovado) {
            console.log("No se pudo renovar el token, se cancela el envío del mensaje.");
            return;
        }

        auth = authRenovado;
    }

    console.log("Scope del token guardado:", auth.scope);
    console.log("Fecha en que se creó el token:", auth.creado_en);

    const respuesta = await fetch("https://api.kick.com/public/v1/chat", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${auth.access_token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type: "user",
            content: texto,
            broadcaster_user_id: 72664677
        })
    });

    const resultado = await respuesta.text();
    console.log("Resultado de enviar mensaje al chat:", resultado);

}

async function conectarChatKick() {

   const chatroomId = 71207506;

    console.log("Usando Chatroom ID:", chatroomId);

    const socket = new WebSocket(PUSHER_WS_URL);

    socket.on("open", () => {
        console.log("Conectado al WebSocket de Kick.");

        socket.send(JSON.stringify({
            event: "pusher:subscribe",
            data: { channel: `chatrooms.${chatroomId}.v2` }
        }));
    });

   socket.on("message", async (mensajeCrudo) => {

        const mensaje = JSON.parse(mensajeCrudo);
let usuario = null;
        let texto = null;
        let esMod = false;

        if (mensaje.event === "App\\Events\\ChatMessageSentEvent") {
            const contenido = JSON.parse(mensaje.data);
            usuario = contenido.user.username;
            texto = contenido.message.message;
            const badges = (contenido.user.identity && contenido.user.identity.badges) || [];
            esMod = badges.some(b => b.type === "moderator" || b.type === "broadcaster");
            console.log("Badges de", usuario, ":", badges, "| esMod:", esMod);
        }

        if (mensaje.event === "App\\Events\\ChatMessageEvent") {
            const contenido = JSON.parse(mensaje.data);
            usuario = contenido.sender.username;
            texto = contenido.content;
            const badges = (contenido.sender.identity && contenido.sender.identity.badges) || [];
            esMod = badges.some(b => b.type === "moderator" || b.type === "broadcaster");
            console.log("Badges de", usuario, ":", badges, "| esMod:", esMod);
        }

        if (usuario && texto) {

            console.log(`${usuario}: ${texto}`);

         if (canalEnVivo && ROL === "panel") {
                await registrarActividad(usuario);
            }

        const comando = texto.trim().toLowerCase();

            if (ROL === "panel" && comando === "!link") {
                await enviarMensajeChat(`@${usuario} Mira el panel completo aquí: https://merrdbot.onrender.com`);
            }

           if (ROL === "panel" && (comando === "!puntos" || comando === "!nivel" || comando === "!watchtime")) {

                const datosUsuario = await Comunidad.findOne({ usuario: usuario });

                if (!datosUsuario) {
                    await enviarMensajeChat(`@${usuario} Todavía no tengo datos tuyos, ¡sigue participando en el chat!`);
                } else {

                    if (comando === "!puntos") {
                        await enviarMensajeChat(`@${usuario} tienes ${datosUsuario.puntos} pts`);
                    }

                    if (comando === "!nivel") {
                        await enviarMensajeChat(`@${usuario} estás en el nivel ${datosUsuario.nivel}`);
                    }

               if (comando === "!watchtime") {
                        const dias = Math.floor(datosUsuario.watchtime / 1440);
                        const horas = Math.floor((datosUsuario.watchtime % 1440) / 60);
                        const minutos = datosUsuario.watchtime % 60;
                        await enviarMensajeChat(`@${usuario} has visto este canal durante ${dias} días ${horas} horas ${minutos} minutos`);
                    }

                }
            }

        if (ROL === "grabacion" && comando.startsWith("!clip")) {

                const argumentoTexto = texto.trim().slice(5).trim();

                if (!grabacionEnCurso()) {
                    await enviarMensajeChat(`@${usuario} no hay grabación activa en este momento.`);
                    return;
                }

                try {

                    const resultado = await procesarComandoClip({
                        streamer: KICK_SLUG,
                        usuarioCreador: usuario,
                        argumentoTexto: argumentoTexto,
                        rutaGrabacion: obtenerRutaGrabacionActual(),
                        io: io
                    });

                    if (!resultado.valido) {
                        await enviarMensajeChat(`@${usuario} ${resultado.error}`);
                    } else {
                        await enviarMensajeChat(`@${usuario} clip creado ✅`);
                    }

                } catch (error) {
                    console.log("Error procesando !clip:", error.message);
                    await enviarMensajeChat(`@${usuario} hubo un error creando el clip.`);
                }

            }

          if (ROL === "panel" && comando.startsWith("!mr ")) {

                const nombreCancion = texto.trim().slice(4).trim();

                if (!nombreCancion) {
                    await enviarMensajeChat(`@${usuario} escribe el nombre de la canción después de !mr`);
                } else {

                    try {

                  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(nombreCancion)}&key=${process.env.YOUTUBE_API_KEY}`;

                        const respuesta = await fetch(url);

                        console.log("DIAGNOSTICO_MR_STATUS:", respuesta.status);

                        const datos = await respuesta.json();

                        console.log("DIAGNOSTICO_MR_DATOS:", JSON.stringify(datos));

                        if (datos.error || !datos.items || datos.items.length === 0) {
                            await enviarMensajeChat(`@${usuario} no encontré esa canción en YouTube.`);
                        } else {

                            const resultado = datos.items[0];

                            const nuevaCancion = new Cola({
                                videoId: resultado.id.videoId,
                                titulo: resultado.snippet.title,
                                pedidoPor: usuario
                            });

                            await nuevaCancion.save();

                            await enviarMensajeChat(`@${usuario} agregada a la cola: ${resultado.snippet.title}`);

                        }

                 } catch (error) {
                        console.log("Error en comando !mr:", error.message);
                        await enviarMensajeChat(`@${usuario} hubo un error buscando la canción.`);
                    }

                }

            }

           if (ROL === "panel" && comando.startsWith("!ruleta ")) {

                if (usuario.toLowerCase() !== "merrd0_ec") {
                    await enviarMensajeChat(`@${usuario} no tienes permiso para usar este comando.`);
                } else {

                    const nombreObjetivo = texto.trim().slice(8).trim();

                    if (!nombreObjetivo) {
                        await enviarMensajeChat(`@${usuario} escribe el nombre después de !ruleta. Ejemplo: !ruleta Jara`);
                    } else {
                        participantesPendientesRuleta.push(nombreObjetivo);
                        await enviarMensajeChat(`${nombreObjetivo} ha ingresado con éxito`);
                    }

                }

            }

            console.log("Comparando comando:", JSON.stringify(comando), "| config Sorteos:", JSON.stringify(comandoAutoSorteos), "| config Ruleta:", JSON.stringify(comandoAutoRuleta));

           if (ROL === "panel" && comandoAutoSorteos.activo && comandoAutoSorteos.comando && comando === comandoAutoSorteos.comando) {
                participantesPendientesSorteo.push(usuario);
                console.log("✅ Agregado a pendientes de Sorteos:", usuario);
            }

           if (ROL === "panel" && comandoAutoRuleta.activo && comandoAutoRuleta.comando && comando === comandoAutoRuleta.comando) {
                participantesPendientesRuleta.push(usuario);
                console.log("✅ Agregado a pendientes de Ruleta:", usuario);
            }

        if (ROL === "panel" && esMod && comando.startsWith("!add ")) {

                const adminAutorizado = await Admin.findOne({
                    usuarioKick: { $regex: new RegExp(`^${usuario.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
                    activo: true
                });

                if (!adminAutorizado) {

                    await enviarMensajeChat(`@${usuario} no tienes permiso para usar este comando.`);

                } else {

                const partes = texto.trim().split(/\s+/);
                const cantidad = parseInt(partes[1]);
                const nombreObjetivo = (partes[2] || "").replace("@", "");

                if (isNaN(cantidad) || !nombreObjetivo) {
                    await enviarMensajeChat(`@${usuario} formato correcto: !add 5000 @usuario`);
                } else {

                    const usuarioEconomia = await Usuario.findOne({ usuario: { $regex: new RegExp(`^${nombreObjetivo}$`, "i") } });

                    if (!usuarioEconomia) {
                        await enviarMensajeChat(`@${usuario} no encontré a "${nombreObjetivo}" en Economía.`);
                    } else {

                        usuarioEconomia.puntos += cantidad;
                        await usuarioEconomia.save();

                        const economiaActualizada = await Usuario.find();
                        io.emit("economia-actualizada", economiaActualizada);

                       await enviarMensajeChat(`@${usuario} se agregaron ${cantidad} puntos a ${usuarioEconomia.usuario}. Ahora tiene ${usuarioEconomia.puntos} pts.`);

                    }

                }

                }

            }

            if (ROL === "panel" && esMod) {

                if (comando === "!mpausar") {
                    comandosMusicaPendientes.push({ accion: "pausar" });
                    await enviarMensajeChat(`@${usuario} música pausada.`);
                }

                if (comando === "!mreanudar") {
                    comandosMusicaPendientes.push({ accion: "reanudar" });
                    await enviarMensajeChat(`@${usuario} música reanudada.`);
                }

                if (comando === "!mskippear") {
                    comandosMusicaPendientes.push({ accion: "skip" });
                    await enviarMensajeChat(`@${usuario} canción saltada.`);
                }

              if (comando === "!mactual") {

                    const actual = await Cola.findOne().sort({ agregado_en: 1 });

                    if (!actual) {
                        await enviarMensajeChat(`@${usuario} no hay ninguna canción sonando ahorita.`);
                    } else {
                        await enviarMensajeChat(`@${usuario} suena "${actual.titulo}", pedida por ${actual.pedidoPor}.`);
                    }

                }

              if (comando.startsWith("!mvolumen")) {

                    const partes = comando.split(" ");
                    const valor = parseInt(partes[1]);

                    if (isNaN(valor) || valor < 0 || valor > 100) {
                        await enviarMensajeChat(`@${usuario} escribe un número entre 0 y 100. Ejemplo: !mvolumen 50`);
                    } else {
                        comandosMusicaPendientes.push({ accion: "volumen", valor: valor });
                        await enviarMensajeChat(`@${usuario} volumen ajustado a ${valor}.`);
                    }

                }

            }
        }
    });

    socket.on("close", () => {
        console.log("Conexión con Kick cerrada.");
    });

    socket.on("error", (error) => {
        console.log("Error en conexión Kick:", error.message);
    });
}

conectarChatKick();

const usuarios = [
    {
        usuario: "Maykel",
        puntos: 0,
        nivel: 1
    }
];

app.get("/api/user", (req, res) => {
    res.json(usuarios[0]);
});

app.get("/api/users", (req, res) => {
    res.json(usuarios);
});
app.get("/api/comunidad", async (req, res) => {

    const comunidad = await Comunidad.find().sort({ ultimaActividad: -1 });
    res.json(comunidad);

});

app.get("/api/admins", async (req, res) => {

    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);

});

app.patch("/api/admins/:id", async (req, res) => {

    const id = req.params.id;

    const admin = await Admin.findById(id);

    if (!admin) {
        res.status(404).json({ error: "Admin no encontrado." });
        return;
    }

    if (admin.esDefault) {
        res.status(403).json({ error: "No se puede desactivar al admin por defecto." });
        return;
    }

    admin.activo = !admin.activo;
    await admin.save();

    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);

});
app.patch("/api/admins/:id/editar", async (req, res) => {

    const id = req.params.id;
    const nuevoUsuario = req.body.usuario;
    const nuevaPassword = req.body.password;
    const nuevoUsuarioKick = req.body.usuarioKick;

    const admin = await Admin.findById(id);

    if (!admin) {
        res.status(404).json({ error: "Admin no encontrado." });
        return;
    }

    if (!nuevoUsuario || nuevoUsuario.trim() === "" || !nuevaPassword || nuevaPassword.trim() === "") {
        res.status(400).json({ error: "Falta usuario o contraseña." });
        return;
    }

    admin.usuario = nuevoUsuario.trim();
    admin.password = nuevaPassword.trim();
    admin.usuarioKick = (nuevoUsuarioKick || "").trim();

    await admin.save();

    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);

});
app.post("/api/admins", async (req, res) => {

    const usuario = req.body.usuario;
    const password = req.body.password;
    const usuarioKick = req.body.usuarioKick;

    if (!usuario || usuario.trim() === "" || !password || password.trim() === "") {
        res.status(400).json({ error: "Falta usuario o contraseña." });
        return;
    }

    const existente = await Admin.findOne({ usuario: usuario.trim() });

    if (existente) {
        res.status(400).json({ error: "Ese usuario ya existe." });
        return;
    }

    const nuevoAdmin = new Admin({
        usuario: usuario.trim(),
        password: password.trim(),
        usuarioKick: (usuarioKick || "").trim(),
        creado_en: new Date(),
        esDefault: false,
        activo: true
    });

    await nuevoAdmin.save();

    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);

});


app.post("/api/admin/login", async (req, res) => {

    const usuario = req.body.usuario;
    const password = req.body.password;

    console.log("Intento de login - usuario recibido:", JSON.stringify(usuario), "| password recibido:", JSON.stringify(password));

    const admin = await Admin.findOne({ usuario: usuario, password: password });

    console.log("Admin encontrado con ese usuario/password exacto:", admin ? admin.usuario : "NINGUNO");

    const soloUsuario = await Admin.findOne({ usuario: usuario });
    console.log("Admin encontrado solo por usuario:", soloUsuario ? JSON.stringify({usuario: soloUsuario.usuario, activo: soloUsuario.activo}) : "NINGUNO");

    if (!admin) {
        res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        return;
    }

    if (!admin.activo) {
        res.status(403).json({ error: "Este usuario administrador está desactivado." });
        return;
    }

    res.json({ ok: true, usuario: admin.usuario, esDefault: admin.esDefault });

});

app.get("/api/economia", async (req, res) => {

    const economia = await Usuario.find();
    res.json(economia);

});

app.post("/api/economia", async (req, res) => {

    const nombre = req.body.nombre;

    if (!nombre || nombre.trim() === "") {
        res.status(400).json({ error: "Falta el nombre." });
        return;
    }

    const nuevoUsuario = new Usuario({
        usuario: nombre.trim(),
        puntos: 0
    });

    await nuevoUsuario.save();

    const economia = await Usuario.find();
    io.emit("economia-actualizada", economia);
    res.json(economia);

});

app.patch("/api/economia/:id", async (req, res) => {

    const id = req.params.id;
    const nuevoNombre = req.body.nombre;
    const nuevosPuntos = req.body.puntos;

    const usuario = await Usuario.findById(id);

    if (!usuario) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
    }

  usuario.usuario = nuevoNombre;
    usuario.puntos = nuevosPuntos;

    await usuario.save();

    const economia = await Usuario.find();
    io.emit("economia-actualizada", economia);
    res.json(economia);

});

app.delete("/api/economia/:id", async (req, res) => {

    const id = req.params.id;

    await Usuario.findByIdAndDelete(id);

    const economia = await Usuario.find();
    io.emit("economia-actualizada", economia);
    res.json(economia);

});
app.delete("/api/economia/:nombre", async (req, res) => {

    const nombre = req.params.nombre;

    await Usuario.deleteOne({ usuario: nombre });

    const economia = await Usuario.find();
    io.emit("economia-actualizada", economia);
    res.json(economia);

});
app.delete("/api/economia/:nombre", async (req, res) => {

    const nombre = req.params.nombre;

    await Usuario.deleteOne({ usuario: nombre });

    const economia = await Usuario.find();
    io.emit("economia-actualizada", economia);
    res.json(economia);

});

app.delete("/api/admins/:id", async (req, res) => {

    const id = req.params.id;

    const admin = await Admin.findById(id);

    if (admin && admin.esDefault) {
        const otrosDefault = await Admin.countDocuments({ esDefault: true, _id: { $ne: id } });
        if (otrosDefault === 0) {
            res.status(403).json({ error: "No puedes borrar el único admin por defecto." });
            return;
        }
    }

    await Admin.findByIdAndDelete(id);

    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});