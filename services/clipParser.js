function tiempoASegundos(texto) {

    if (!/^\d{1,2}(:\d{1,2}){1,2}$/.test(texto)) {
        return null;
    }

    const partes = texto.split(":").map(Number);

    if (partes.some(p => isNaN(p))) {
        return null;
    }

    let segundos = 0;

    if (partes.length === 3) {
        const [h, m, s] = partes;
        if (m > 59 || s > 59) return null;
        segundos = h * 3600 + m * 60 + s;
    } else if (partes.length === 2) {
        const [m, s] = partes;
        if (s > 59) return null;
        segundos = m * 60 + s;
    } else {
        return null;
    }

    return segundos;

}

const DURACION_MINIMA = 1;
const DURACION_MAXIMA = 90;

function parsearComandoClip(argumento) {

    if (!argumento || argumento.trim() === "") {
        return { valido: false, error: "Escribe el rango de tiempo. Ejemplo: !clip 1:09:56-1:10:14" };
    }

    const texto = argumento.trim();

    let partes;

    if (texto.includes("-")) {
        partes = texto.split("-").map(p => p.trim());
    } else {
        partes = texto.split(/\s+/);
    }

    if (partes.length !== 2) {
        return { valido: false, error: "Formato inválido. Usa: !clip 1:09:56-1:10:14 o !clip 1:09:56 20" };
    }

    const inicioSegundos = tiempoASegundos(partes[0]);

    if (inicioSegundos === null) {
        return { valido: false, error: `Tiempo de inicio inválido: "${partes[0]}"` };
    }

    let finSegundos;

    if (/^\d+$/.test(partes[1])) {
        const duracion = parseInt(partes[1]);
        finSegundos = inicioSegundos + duracion;
    } else {
        finSegundos = tiempoASegundos(partes[1]);
        if (finSegundos === null) {
            return { valido: false, error: `Tiempo de fin inválido: "${partes[1]}"` };
        }
    }

    if (finSegundos <= inicioSegundos) {
        return { valido: false, error: "El tiempo de fin debe ser mayor al de inicio." };
    }

    const duracionSegundos = finSegundos - inicioSegundos;

    if (duracionSegundos < DURACION_MINIMA) {
        return { valido: false, error: "El clip es demasiado corto." };
    }

    if (duracionSegundos > DURACION_MAXIMA) {
        return { valido: false, error: `El clip no puede durar más de ${DURACION_MAXIMA} segundos.` };
    }

    return { valido: true, inicioSegundos, finSegundos, duracionSegundos };

}

module.exports = { parsearComandoClip, tiempoASegundos };