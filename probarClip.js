const { generarVersionVerticalPersonalizada } = require("./services/clipService");

generarVersionVerticalPersonalizada("clip_prueba.mp4", "vertical_personalizada_prueba.mp4", {
    zoom: 125,
    offsetX: 0,
    offsetY: 0
})
    .then((resultado) => {
        console.log("ÉXITO:", resultado);
    })
    .catch((error) => {
        console.log("ERROR:", error.message);
    });