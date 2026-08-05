const mongoose = require("mongoose");

const clipSchema = new mongoose.Schema({
    streamer: String,
    usuarioCreador: String,
    titulo: String,
    duracionSegundos: Number,
    miniatura: String,
   rutaVideo: String,
    rutaVideoVertical: String,
    zoom: { type: Number, default: 100 },
    offsetX: { type: Number, default: 0 },
    offsetY: { type: Number, default: 0 },
    subtituloMarginV: { type: Number, default: 40 },
    vistas: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    estado: {
        type: String,
        enum: ["Borrador", "Editado", "Publicado"],
        default: "Borrador"
    },
    creado_en: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Clip", clipSchema);