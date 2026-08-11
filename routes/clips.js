const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Clip = require("../models/Clip");
const { recortarClipExistente, generarVersionVerticalPersonalizada, generarVersionVerticalFondoDifuminado, generarVersionCamaraJuego, generarSubtitulos, quemarSubtitulos, convertirClipAUrlsAbsolutas } = require("../services/clipService");
const path = require("path");
const fs = require("fs");
const ROL = process.env.ROL || "panel";

router.get("/", async (req, res) => {
    const clips = await Clip.find().sort({ creado_en: -1 });
    console.log("DIAGNOSTICO_CLIPS - cantidad encontrada:", clips.length, "| conectado a DB:", mongoose.connection.name);
    res.json(clips.map(convertirClipAUrlsAbsolutas));
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

    res.json(convertirClipAUrlsAbsolutas(clip));

});

router.post("/:id/recortar", async (req, res) => {

    const id = req.params.id;

    if (ROL === "panel") {

        try {

            const respuestaAws = await fetch(`${process.env.AWS_INTERNAL_URL}/api/clips/${id}/recortar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req.body)
            });

            const textoCrudo = await respuestaAws.text();
            const textoLimpio = textoCrudo.split(process.env.AWS_INTERNAL_URL).join("");

            res.status(respuestaAws.status).set("Content-Type", "application/json").send(textoLimpio);

        } catch (error) {
            console.log("Error reenviando recorte a AWS:", error.message);
            res.status(500).json({ error: "Error interno al recortar el clip." });
        }

        return;

    }

    const inicioSegundos = parseFloat(req.body.inicioSegundos);
    const duracionSegundos = parseFloat(req.body.duracionSegundos);

    if (isNaN(inicioSegundos) || isNaN(duracionSegundos)) {
        res.status(400).json({ error: "Faltan inicioSegundos o duracionSegundos válidos." });
        return;
    }

    try {

        const resultado = await recortarClipExistente({ clipId: id, inicioSegundos, duracionSegundos });

        if (!resultado.valido) {
            res.status(400).json({ error: resultado.error });
            return;
        }

        res.json(convertirClipAUrlsAbsolutas(resultado.clip));

    } catch (error) {
        console.log("Error recortando clip:", error.message);
        res.status(500).json({ error: "Error interno al recortar el clip." });
    }

});

router.post("/:id/reposicionar", async (req, res) => {

    const id = req.params.id;

    if (ROL === "panel") {

        try {

            const respuestaAws = await fetch(`${process.env.AWS_INTERNAL_URL}/api/clips/${id}/reposicionar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req.body)
            });

            const textoCrudo = await respuestaAws.text();
            const textoLimpio = textoCrudo.split(process.env.AWS_INTERNAL_URL).join("");

            res.status(respuestaAws.status).set("Content-Type", "application/json").send(textoLimpio);

        } catch (error) {
            console.log("Error reenviando reposicionar a AWS:", error.message);
            res.status(500).json({ error: "Error interno al reposicionar el clip." });
        }

        return;

    }

    const zoom = parseFloat(req.body.zoom);
    const offsetX = parseFloat(req.body.offsetX);
    const offsetY = parseFloat(req.body.offsetY);
    const subtituloMarginV = req.body.subtituloMarginV !== undefined ? parseFloat(req.body.subtituloMarginV) : 40;

    if (isNaN(zoom) || isNaN(offsetX) || isNaN(offsetY) || isNaN(subtituloMarginV)) {
        res.status(400).json({ error: "Faltan zoom, offsetX, offsetY o subtituloMarginV válidos." });
        return;
    }

    const clip = await Clip.findById(id);

    if (!clip) {
        res.status(404).json({ error: "Clip no encontrado." });
        return;
    }

    console.log(`>>> INICIO reposicionar clip ${id} (zoom=${zoom}, offsetX=${offsetX}, offsetY=${offsetY})`);

  try {

        const rutaMp4Actual = path.join(__dirname, "..", "public", clip.rutaVideo);
        const rutaVerticalActual = path.join(__dirname, "..", "public", clip.rutaVideoVertical);

        await generarVersionVerticalPersonalizada(rutaMp4Actual, rutaVerticalActual, { zoom, offsetX, offsetY });

        console.log(`>>> Vertical personalizada generada para ${id}`);

        try {

            const carpetaClips = path.join(__dirname, "..", "public", "clips");
            const rutaSrt = path.join(carpetaClips, `${path.basename(clip.rutaVideoVertical, ".mp4")}.srt`);
            const rutaVerticalConSubs = path.join(carpetaClips, `${path.basename(clip.rutaVideoVertical, ".mp4")}_subs.mp4`);

            if (!fs.existsSync(rutaSrt)) {
                await generarSubtitulos(rutaVerticalActual, rutaSrt);
            }

            await quemarSubtitulos(rutaVerticalActual, rutaSrt, rutaVerticalConSubs, subtituloMarginV);

            fs.unlinkSync(rutaVerticalActual);
            fs.renameSync(rutaVerticalConSubs, rutaVerticalActual);

            console.log(`>>> Subtítulos quemados OK para ${id}`);

        } catch (errorSubs) {
            console.log("No se pudieron regenerar subtítulos tras reposicionar:", errorSubs.message);
        }

        clip.zoom = zoom;
        clip.offsetX = offsetX;
        clip.offsetY = offsetY;
        clip.subtituloMarginV = subtituloMarginV;

        await clip.save();

        res.json(convertirClipAUrlsAbsolutas(clip));

    } catch (error) {
        console.log("Error reposicionando clip:", error.message);
        res.status(500).json({ error: "Error interno al reposicionar el clip." });
    }

});

router.post("/:id/formato", async (req, res) => {

    const id = req.params.id;

    if (ROL === "panel") {

        try {

            const respuestaAws = await fetch(`${process.env.AWS_INTERNAL_URL}/api/clips/${id}/formato`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req.body)
            });

            const textoCrudo = await respuestaAws.text();
            const textoLimpio = textoCrudo.split(process.env.AWS_INTERNAL_URL).join("");

            res.status(respuestaAws.status).set("Content-Type", "application/json").send(textoLimpio);

        } catch (error) {
            console.log("Error reenviando formato a AWS:", error.message);
            res.status(500).json({ error: "Error interno al cambiar el formato." });
        }

        return;

    }

    const formato = req.body.formato;

    if (!["normal", "difuminado", "camarajuego"].includes(formato)) {
        res.status(400).json({ error: "Formato inválido." });
        return;
    }

    const clip = await Clip.findById(id);

    if (!clip) {
        res.status(404).json({ error: "Clip no encontrado." });
        return;
    }

    try {

        const rutaMp4Original = path.join(__dirname, "..", "public", clip.rutaVideo);
        const rutaVerticalActual = path.join(__dirname, "..", "public", clip.rutaVideoVertical);

        if (formato === "normal") {
            await generarVersionVerticalPersonalizada(rutaMp4Original, rutaVerticalActual, { zoom: clip.zoom || 100, offsetX: clip.offsetX || 0, offsetY: clip.offsetY || 0 });
        } else if (formato === "difuminado") {
            await generarVersionVerticalFondoDifuminado(rutaMp4Original, rutaVerticalActual);
        } else if (formato === "camarajuego") {
            await generarVersionCamaraJuego(rutaMp4Original, rutaVerticalActual);
        }

        try {

        const carpetaClips = path.join(__dirname, "..", "public", "clips");
            const nombreBase = path.basename(clip.rutaVideoVertical, ".mp4");
            const rutaSrt = path.join(carpetaClips, `${nombreBase}.srt`);
            const rutaVerticalConSubs = path.join(carpetaClips, `${nombreBase}_subs.mp4`);

            if (!fs.existsSync(rutaSrt)) {
                await generarSubtitulos(rutaVerticalActual, rutaSrt);
            }

            await quemarSubtitulos(rutaVerticalActual, rutaSrt, rutaVerticalConSubs, clip.subtituloMarginV);

            fs.unlinkSync(rutaVerticalActual);
            fs.renameSync(rutaVerticalConSubs, rutaVerticalActual);

        } catch (errorSubs) {
            console.log("No se pudieron regenerar subtítulos tras cambiar formato:", errorSubs.message);
        }

       clip.formato = formato;
        await clip.save();

        res.json(convertirClipAUrlsAbsolutas(clip));

    } catch (error) {
        console.log("Error cambiando formato del clip:", error.message);
        res.status(500).json({ error: "Error interno al cambiar el formato." });
    }

});

router.get("/:id/subtitulos", async (req, res) => {

    const id = req.params.id;

    if (ROL === "panel") {

        try {

            const respuestaAws = await fetch(`${process.env.AWS_INTERNAL_URL}/api/clips/${id}/subtitulos`);
            const textoCrudo = await respuestaAws.text();
            const textoLimpio = textoCrudo.split(process.env.AWS_INTERNAL_URL).join("");

            res.status(respuestaAws.status).set("Content-Type", "application/json").send(textoLimpio);

        } catch (error) {
            console.log("Error reenviando lectura de subtítulos a AWS:", error.message);
            res.status(500).json({ error: "Error interno al leer los subtítulos." });
        }

        return;

    }

    const clip = await Clip.findById(id);

    if (!clip) {
        res.status(404).json({ error: "Clip no encontrado." });
        return;
    }

    try {

        const carpetaClips = path.join(__dirname, "..", "public", "clips");
        const nombreBase = path.basename(clip.rutaVideoVertical, ".mp4");
        const rutaSrt = path.join(carpetaClips, `${nombreBase}.srt`);

        if (!fs.existsSync(rutaSrt)) {
            res.status(404).json({ error: "Este clip todavía no tiene subtítulos generados." });
            return;
        }

        const contenidoSrt = fs.readFileSync(rutaSrt, "utf-8");

        res.json({ srt: contenidoSrt });

    } catch (error) {
        console.log("Error leyendo subtítulos:", error.message);
        res.status(500).json({ error: "Error interno al leer los subtítulos." });
    }

});
router.post("/:id/subtitulos", async (req, res) => {

    const id = req.params.id;

    if (ROL === "panel") {

        try {

            const respuestaAws = await fetch(`${process.env.AWS_INTERNAL_URL}/api/clips/${id}/subtitulos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(req.body)
            });

            const textoCrudo = await respuestaAws.text();
            const textoLimpio = textoCrudo.split(process.env.AWS_INTERNAL_URL).join("");

            res.status(respuestaAws.status).set("Content-Type", "application/json").send(textoLimpio);

        } catch (error) {
            console.log("Error reenviando edición de subtítulos a AWS:", error.message);
            res.status(500).json({ error: "Error interno al guardar los subtítulos." });
        }

        return;

    }

    const srtNuevo = req.body.srt;

    if (typeof srtNuevo !== "string" || srtNuevo.trim() === "") {
        res.status(400).json({ error: "Falta el texto de los subtítulos." });
        return;
    }

    const clip = await Clip.findById(id);

    if (!clip) {
        res.status(404).json({ error: "Clip no encontrado." });
        return;
    }

    try {

        const carpetaClips = path.join(__dirname, "..", "public", "clips");
        const nombreBase = path.basename(clip.rutaVideoVertical, ".mp4");
        const rutaSrt = path.join(carpetaClips, `${nombreBase}.srt`);
        const rutaVerticalActual = path.join(__dirname, "..", "public", clip.rutaVideoVertical);
        const rutaVerticalConSubs = path.join(carpetaClips, `${nombreBase}_subs.mp4`);

        fs.writeFileSync(rutaSrt, srtNuevo, "utf-8");

        await quemarSubtitulos(rutaVerticalActual, rutaSrt, rutaVerticalConSubs, clip.subtituloMarginV);

        fs.unlinkSync(rutaVerticalActual);
        fs.renameSync(rutaVerticalConSubs, rutaVerticalActual);

        res.json({ ok: true });

    } catch (error) {
        console.log("Error guardando subtítulos editados:", error.message);
        res.status(500).json({ error: "Error interno al guardar los subtítulos." });
    }

});

router.delete("/:id", async (req, res) => {

    const id = req.params.id;

    await Clip.findByIdAndDelete(id);

    res.json({ ok: true });

});

module.exports = router;