const express = require("express");
const WebSocket = require("ws");

const app = express();
app.use(express.static("public"));

const KICK_SLUG = "eloviedo";
const PUSHER_WS_URL = "wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0-rc2&flash=false";

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

    socket.on("message", (mensajeCrudo) => {

        console.log("EVENTO CRUDO:", mensajeCrudo.toString());

        const mensaje = JSON.parse(mensajeCrudo);

        if (mensaje.event === "App\\Events\\ChatMessageSentEvent") {
            const contenido = JSON.parse(mensaje.data);
            console.log(`${contenido.user.username}: ${contenido.message.message}`);
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

app.use(express.json());

let economia = [];

app.get("/api/economia", (req, res) => {
    res.json(economia);
});

app.post("/api/economia", (req, res) => {

    const nombre = req.body.nombre;

    if (!nombre || nombre.trim() === "") {
        res.status(400).json({ error: "Falta el nombre." });
        return;
    }

    economia.push({
        usuario: nombre.trim(),
        puntos: 0
    });

    res.json(economia);
});

app.patch("/api/economia/:nombre", (req, res) => {

    const nombreActual = req.params.nombre;
    const nuevoNombre = req.body.nombre;
    const nuevosPuntos = req.body.puntos;

    const usuario = economia.find(u => u.usuario === nombreActual);

    if (!usuario) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
    }

    usuario.usuario = nuevoNombre;
    usuario.puntos = nuevosPuntos;

    res.json(economia);
});

app.delete("/api/economia/:nombre", (req, res) => {

    const nombre = req.params.nombre;

    economia = economia.filter(u => u.usuario !== nombre);

    res.json(economia);
});
app.get("/api/users", (req, res) => {
    res.json(usuarios);
});

app.listen(3000, () => {
    console.log("Servidor iniciado en http://localhost:3000");
});
