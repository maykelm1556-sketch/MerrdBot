const DURACION_MINIMA = 1;
const DURACION_MAXIMA = 90;

function parsearComandoClip(argumento) {

    if (!argumento || argumento.trim() === "") {
        return { valido: false, error: "Escribe cuántos segundos hacia atrás quieres cortar. Ejemplo: !clip 45" };
    }

    const texto = argumento.trim();

    if (!/^\d+$/.test(texto)) {
        return { valido: false, error: `Formato inválido. Usa: !clip 45 (segundos hacia atrás, entre ${DURACION_MINIMA} y ${DURACION_MAXIMA})` };
    }

    const segundosAtras = parseInt(texto);

    if (segundosAtras < DURACION_MINIMA) {
        return { valido: false, error: "El clip es demasiado corto." };
    }

    if (segundosAtras > DURACION_MAXIMA) {
        return { valido: false, error: `El clip no puede durar más de ${DURACION_MAXIMA} segundos.` };
    }

    return { valido: true, segundosAtras: segundosAtras };

}

module.exports = { parsearComandoClip };