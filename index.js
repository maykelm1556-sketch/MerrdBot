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
const sugerenciaSchema = new mongoose.Schema({
    texto: String,
    fecha: { type: Date, default: Date.now }
});

const Sugerencia = mongoose.model("Sugerencia", sugerenciaSchema);

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
const Comunidad = mongoose.model("Comunidad", comunidadSchema);

const adminSchema = new mongoose.Schema({
    usuario: String,
    password: String,
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

async function verificarEnVivo() {

    try {

        const respuesta = await fetch(`https://kick.com/api/v2/channels/${KICK_SLUG}`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const datos = await respuesta.json();

        canalEnVivo = datos && datos.livestream !== null && datos.livestream !== undefined;

    } catch (error) {
        console.error("Error consultando estado de Kick:", error.message);
        canalEnVivo = false;
    }

}

verificarEnVivo();
setInterval(verificarEnVivo, 60000);

app.get("/api/estado-vivo", (req, res) => {
    res.json({ enVivo: canalEnVivo });
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

            if (canalEnVivo) {
                await registrarActividad(usuario);
            }

        const comando = texto.trim().toLowerCase();

            if (comando === "!link") {
                await enviarMensajeChat(`@${usuario} Mira el panel completo aquí: https://merrdbot.onrender.com`);
            }

            if (comando === "!puntos" || comando === "!nivel" || comando === "!watchtime") {

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

    await admin.save();

    const admins = await Admin.find({}, { password: 0 });
    res.json(admins);

});
app.post("/api/admins", async (req, res) => {

    const usuario = req.body.usuario;
    const password = req.body.password;

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

    const admin = await Admin.findOne({ usuario: usuario, password: password });

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

app.listen(PORT, () => {
    console.log(`Servidor iniciado en el puerto ${PORT}`);
});