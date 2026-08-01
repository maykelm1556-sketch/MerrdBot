const express = require("express");
const router = express.Router();
const Clip = require("../models/Clip");

router.get("/", async (req, res) => {
    const clips = await Clip.find().sort({ creado_en: -1 });
    res.json(clips);
});

router.patch("/:id", async (req, res) => {

    const id = req.params.id;
    const cambios = {};

    if (req.body.titulo !== undefined) cambios.titulo = req.body.titulo;
    if (req.body.miniatura !== undefined) cambios.miniatura = req.body.miniatura;
    if (req.body.estado !== undefined) cambios.estado = req.body.estado;

    const clip = await Clip.findByIdAndUpdate(id, cambios, { new: true });

    if (!clip) {
        res.status(404).json({ error: "Clip no encontrado." });
        return;
    }

    res.json(clip);

});

router.delete("/:id", async (req, res) => {

    const id = req.params.id;

    await Clip.findByIdAndDelete(id);

    res.json({ ok: true });

});

module.exports = router;