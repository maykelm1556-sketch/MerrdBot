const express = require("express");
const WebSocket = require("ws");
const crypto = require("crypto");
require("dotenv").config();
const mongoose = require("mongoose");
const app = express();
app.use(express.static("public"));
app.use(express.json());

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

const Comunidad = mongoose.model("Comunidad", comunidadSchema);

const adminSchema = new mongoose.Schema({
    usuario: String,
    password: String,
    creado_en: Date
});

const Admin = mongoose.model("Admin", adminSchema);

async function crearAdminPorDefecto() {

    const existente = await Admin.findOne({ usuario: "Maykel" });

    if (!existente) {
        const nuevoAdmin = new Admin({
            usuario: "Maykel",
            password: "12345",
            creado_en: new Date()
        });
        await nuevoAdmin.save();
        console.log("Admin por defecto creado (Maykel) ✅");
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

        const respuesta = await fetch("https://id.kick.com/oauth/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: process.env.KICK_CLIENT_ID,
                client_secret: process.env.KICK_CLIENT_SECRET,
                redirect_uri: process.env.KICK_REDIRECT_URI,
                code_verifier: codeVerifierGuardado,
                code: code
            })
        });

        const textoCrudo = await respuesta.text();

        const datos = JSON.parse(textoCrudo);

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

        res.send("Autorización completada y guardada. Ya puedes cerrar esta pestaña.");

    } catch (error) {
        console.log("Error al intercambiar el código:", error.message);
        res.send("Ocurrió un error al completar la autorización.");
    }

});

const KICK_SLUG = "eloviedo";
const PUSHER_WS_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false";

async function enviarMensajeChat(texto) {

    const auth = await KickAuth.findOne();

    if (!auth) {
        console.log("No hay token de Kick guardado. No se pudo enviar el mensaje.");
        return;
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

        if (mensaje.event === "App\\Events\\ChatMessageSentEvent") {
            const contenido = JSON.parse(mensaje.data);
            usuario = contenido.user.username;
            texto = contenido.message.message;
        }

        if (mensaje.event === "App\\Events\\ChatMessageEvent") {
            const contenido = JSON.parse(mensaje.data);
            usuario = contenido.sender.username;
            texto = contenido.content;
        }

        if (usuario && texto) {

            console.log(`${usuario}: ${texto}`);

            await registrarActividad(usuario);

            if (texto.trim().toLowerCase() === "!puntos") {
                await enviarMensajeChat(`@${usuario} Mira tus puntos y el ranking aquí: https://merrdbot.onrender.com`);
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

app.post("/api/admin/login", async (req, res) => {

    const usuario = req.body.usuario;
    const password = req.body.password;

    const admin = await Admin.findOne({ usuario: usuario, password: password });

    if (!admin) {
        res.status(401).json({ error: "Usuario o contraseña incorrectos." });
        return;
    }

    res.json({ ok: true, usuario: admin.usuario });

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
    res.json(economia);

});

app.delete("/api/economia/:id", async (req, res) => {

    const id = req.params.id;

    await Usuario.findByIdAndDelete(id);

    const economia = await Usuario.find();
    res.json(economia);

});
app.delete("/api/economia/:nombre", async (req, res) => {

    const nombre = req.params.nombre;

    await Usuario.deleteOne({ usuario: nombre });

    const economia = await Usuario.find();
    res.json(economia);

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});