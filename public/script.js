function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

const btnAdminCorona = document.getElementById("btnAdminCorona");
const dropdownAdmin = document.getElementById("dropdownAdmin");

btnAdminCorona.addEventListener("click", () => {

    if (dropdownAdmin.style.display === "block") {
        dropdownAdmin.style.display = "none";
    } else {
        dropdownAdmin.style.display = "block";
    }

});

document.addEventListener("click", (e) => {

    const dentroDelMenu = document.getElementById("menuAdminContenedor").contains(e.target);

    if (!dentroDelMenu && dropdownAdmin.style.display === "block") {
        dropdownAdmin.style.display = "none";
    }

});

tabs.forEach(tab => {

    tab.addEventListener("click", () => {

        tabs.forEach(t => t.classList.remove("active"));
        panels.forEach(panel => panel.classList.remove("active"));

        tab.classList.add("active");

        const panel = document.getElementById(tab.dataset.tab);

        panel.classList.add("active");

    });

});

const btnNuevoUsuario = document.getElementById("btnNuevoUsuario");
const formNuevoUsuario = document.getElementById("formNuevoUsuario");

btnNuevoUsuario.addEventListener("click", () => {

    formNuevoUsuario.style.display = "block";

});

let economia = [];

const guardarUsuario = document.getElementById("guardarUsuario");
const nombreUsuario = document.getElementById("nombreUsuario");
const economiaLista = document.getElementById("economiaLista");

function limpiarNumero(texto) {
    return parseInt(texto.replace(/[.,\s]/g, ""));
}

function renderEconomia() {

    economiaLista.innerHTML = "";

    const economiaOrdenada = [...economia].sort((a, b) => b.puntos - a.puntos);

    economiaOrdenada.forEach((usuario, index) => {
        economiaLista.innerHTML += `
        <div class="usuario-item">
            <span class="usuario-numero">#${index + 1}</span>
            <span class="usuario-nombre">${usuario.usuario}</span>
        <span class="usuario-puntos">${usuario.puntos.toLocaleString("es-ES")} pts</span>
        ${adminAutenticado ? `
    <button class="editarUsuario" data-id="${usuario._id}">
    Editar
</button>

<button class="eliminarUsuario" data-id="${usuario._id}">
    Eliminar
</button>
` : ""}
        </div>
    `;
    });
}

function cargarEconomia() {

    fetch("/api/economia")
        .then(response => response.json())
        .then(data => {
            economia = data;
            renderEconomia();
        });
}

cargarEconomia();

guardarUsuario.addEventListener("click", () => {

    if (!adminAutenticado) {
        alert("Solo un administrador puede agregar usuarios.");
        return;
    }

    const nombre = nombreUsuario.value.trim();

    if (nombre === "") {
        alert("Escribe un nombre.");
        return;
    }

    fetch("/api/economia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombre })
    })
        .then(response => response.json())
        .then(data => {
            economia = data;
            renderEconomia();
        });

    nombreUsuario.value = "";
    formNuevoUsuario.style.display = "none";

});

const btnAdminLogin = document.getElementById("btnAdminLogin");
const adminUsuario = document.getElementById("adminUsuario");
const adminPassword = document.getElementById("adminPassword");
const adminError = document.getElementById("adminError");
const adminLogin = document.getElementById("adminLogin");
const adminPanel = document.getElementById("adminPanel");

let adminAutenticado = false;

function activarModoAdmin(usuario) {

    adminAutenticado = true;
    adminLogin.style.display = "none";
    adminPanel.style.display = "block";
    adminError.style.display = "none";
cargarSugerencias();
    cargarAdmins();
    document.querySelectorAll(".admin-only").forEach(el => {
        el.style.display = "inline-block";
    });

    renderEconomia();

}

btnAdminLogin.addEventListener("click", () => {

    const usuario = adminUsuario.value.trim();
    const password = adminPassword.value.trim();

    fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario, password: password })
    })
        .then(response => {
            if (!response.ok) {
                throw new Error("Credenciales incorrectas");
            }
            return response.json();
        })
      .then(data => {
            localStorage.setItem("merrdbot_admin_usuario", usuario);
            localStorage.setItem("merrdbot_admin_password", password);
            localStorage.setItem("merrdbot_admin_esDefault", data.esDefault ? "true" : "false");
            activarModoAdmin(usuario);
            alert("Bienvenido, " + usuario + ". Acceso de administrador concedido.");
        })
        .catch(() => {
            adminError.style.display = "block";
        });

});

const usuarioGuardado = localStorage.getItem("merrdbot_admin_usuario");
const passwordGuardado = localStorage.getItem("merrdbot_admin_password");

if (usuarioGuardado && passwordGuardado) {

    fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioGuardado, password: passwordGuardado })
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {
            if (status === 200) {
                localStorage.setItem("merrdbot_admin_esDefault", data.esDefault ? "true" : "false");
                activarModoAdmin(usuarioGuardado);
            }
        });

}

const modalEditar = document.getElementById("modalEditar");
const editarNombreInput = document.getElementById("editarNombreInput");
const editarPuntosInput = document.getElementById("editarPuntosInput");
const guardarEdicion = document.getElementById("guardarEdicion");
const cancelarEdicion = document.getElementById("cancelarEdicion");

let idEditando = null;

cancelarEdicion.addEventListener("click", () => {
    modalEditar.style.display = "none";
    idEditando = null;
});

guardarEdicion.addEventListener("click", () => {

    const nuevoNombre = editarNombreInput.value.trim();
    const nuevosPuntos = limpiarNumero(editarPuntosInput.value);

    if (nuevoNombre === "" || isNaN(nuevosPuntos)) {
        alert("Completa nombre y puntos correctamente.");
        return;
    }

    fetch(`/api/economia/${idEditando}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            nombre: nuevoNombre,
            puntos: nuevosPuntos
        })
    })
        .then(response => response.json())
        .then(data => {
            economia = data;
            renderEconomia();
            modalEditar.style.display = "none";
            idEditando = null;
        });

});

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("eliminarUsuario")) {

        if (!adminAutenticado) {
            alert("Solo un administrador puede eliminar usuarios.");
            return;
        }

        const id = e.target.dataset.id;

        fetch(`/api/economia/${id}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(data => {
                economia = data;
                renderEconomia();
            });
    }

    if (e.target.classList.contains("editarUsuario")) {

        if (!adminAutenticado) {
            alert("Solo un administrador puede editar usuarios.");
            return;
        }

        const id = e.target.dataset.id;

        const usuario = economia.find(u => u._id === id);

        if (!usuario) {
            return;
        }

        idEditando = id;
        editarNombreInput.value = usuario.usuario;
        editarPuntosInput.value = usuario.puntos;
        modalEditar.style.display = "flex";
    }

});

const participantes = [];

const nombreSorteo = document.getElementById("nombreSorteo");
const agregarParticipante = document.getElementById("agregarParticipante");
const listaParticipantes = document.getElementById("listaParticipantes");

agregarParticipante.addEventListener("click", () => {

    const nombre = nombreSorteo.value.trim();

    if (nombre === "") {
        alert("Escribe un nombre.");
        return;
    }

    participantes.push(nombre);

    renderParticipantes();

    nombreSorteo.value = "";

});

function renderParticipantes() {

    listaParticipantes.innerHTML = "";

    participantes.forEach((nombre, index) => {
        listaParticipantes.innerHTML += `
        <li>
            ${nombre}
            <button class="eliminarParticipante" data-index="${index}">Eliminar</button>
        </li>
    `;
    });
}

const importarEconomia = document.getElementById("importarEconomia");

const modalPuntosMinimos = document.getElementById("modalPuntosMinimos");
const puntosMinimosInput = document.getElementById("puntosMinimosInput");
const confirmarPuntosMinimos = document.getElementById("confirmarPuntosMinimos");
const cancelarPuntosMinimos = document.getElementById("cancelarPuntosMinimos");

const btnSincronizarSorteos = document.getElementById("btnSincronizarSorteos");
const dropdownSincronizarSorteos = document.getElementById("dropdownSincronizarSorteos");
const btnSincronizarRuleta = document.getElementById("btnSincronizarRuleta");
const dropdownSincronizarRuleta = document.getElementById("dropdownSincronizarRuleta");

btnSincronizarSorteos.addEventListener("click", () => {
    dropdownSincronizarSorteos.style.display = dropdownSincronizarSorteos.style.display === "block" ? "none" : "block";
});

btnSincronizarRuleta.addEventListener("click", () => {
    dropdownSincronizarRuleta.style.display = dropdownSincronizarRuleta.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", (e) => {

    if (!btnSincronizarSorteos.contains(e.target) && !dropdownSincronizarSorteos.contains(e.target)) {
        dropdownSincronizarSorteos.style.display = "none";
    }

    if (!btnSincronizarRuleta.contains(e.target) && !dropdownSincronizarRuleta.contains(e.target)) {
        dropdownSincronizarRuleta.style.display = "none";
    }

});

importarEconomia.addEventListener("click", () => {

    if (economia.length === 0) {
        alert("No hay usuarios en Economía todavía.");
        return;
    }

    origenImportacion = "economia";
    puntosMinimosInput.value = "";
    modalPuntosMinimos.style.display = "flex";

});

cancelarPuntosMinimos.addEventListener("click", () => {
    modalPuntosMinimos.style.display = "none";
});

let origenImportacion = "economia";
let destinoImportacion = "sorteos";

const importarComunidad = document.getElementById("importarComunidad");

importarComunidad.addEventListener("click", () => {

    if (comunidadDatos.length === 0) {
        alert("No hay usuarios en Comunidad todavía.");
        return;
    }

   origenImportacion = "comunidad";
    destinoImportacion = "sorteos";
    puntosMinimosInput.value = "";
    modalPuntosMinimos.style.display = "flex";
    dropdownSincronizarSorteos.style.display = "none";

});

const importarEconomiaRuleta = document.getElementById("importarEconomiaRuleta");
const importarComunidadRuleta = document.getElementById("importarComunidadRuleta");

importarEconomiaRuleta.addEventListener("click", () => {

    if (economia.length === 0) {
        alert("No hay usuarios en Economía todavía.");
        return;
    }

 origenImportacion = "economia";
    destinoImportacion = "ruleta";
    puntosMinimosInput.value = "";
    modalPuntosMinimos.style.display = "flex";
    dropdownSincronizarRuleta.style.display = "none";

});

importarComunidadRuleta.addEventListener("click", () => {

    if (comunidadDatos.length === 0) {
        alert("No hay usuarios en Comunidad todavía.");
        return;
    }

   origenImportacion = "comunidad";
    destinoImportacion = "ruleta";
    puntosMinimosInput.value = "";
    modalPuntosMinimos.style.display = "flex";
    dropdownSincronizarRuleta.style.display = "none";

});

confirmarPuntosMinimos.addEventListener("click", () => {

    const minimo = parseInt(puntosMinimosInput.value);

    if (isNaN(minimo)) {
        alert("Escribe un número válido.");
        return;
    }

    const listaOrigen = origenImportacion === "comunidad" ? comunidadDatos : economia;

    const usuariosFiltrados = listaOrigen.filter(usuario => usuario.puntos >= minimo);

    if (usuariosFiltrados.length === 0) {
        alert("Ningún usuario tiene esa cantidad de puntos.");
        return;
    }

    if (destinoImportacion === "ruleta") {

        usuariosFiltrados.forEach((usuario) => {
            if (!participantesRuletaVisual.includes(usuario.usuario)) {
                participantesRuletaVisual.push(usuario.usuario);
            }
        });

        renderListaRuletaVisual();

    } else {

        usuariosFiltrados.forEach((usuario) => {
            if (!participantes.includes(usuario.usuario)) {
                participantes.push(usuario.usuario);
            }
        });

        renderParticipantes();
    }

    modalPuntosMinimos.style.display = "none";

});

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("eliminarParticipante")) {

        const index = parseInt(e.target.dataset.index);

        participantes.splice(index, 1);

        renderParticipantes();
    }

});

const girarRuleta = document.getElementById("girarRuleta");
const resultadoSorteo = document.getElementById("resultadoSorteo");

const duracionGiro = document.getElementById("duracionGiro");

girarRuleta.addEventListener("click", () => {

    if (participantes.length === 0) {
        alert("Agrega al menos un participante.");
        return;
    }

    resultadoSorteo.textContent = "Girando...";

    const segundos = parseFloat(duracionGiro.value) || 1.5;
    const totalVueltas = Math.round((segundos * 1000) / 100);

    const audioCtxSorteo = new (window.AudioContext || window.webkitAudioContext)();

    function reproducirTickSorteo() {
        const osc = audioCtxSorteo.createOscillator();
        const gain = audioCtxSorteo.createGain();
        osc.frequency.value = 700;
        gain.gain.setValueAtTime(0.15, audioCtxSorteo.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtxSorteo.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtxSorteo.destination);
        osc.start();
        osc.stop(audioCtxSorteo.currentTime + 0.05);
    }

    function reproducirFanfarriaSorteo() {
        const notas = [523, 659, 784, 1047];
        notas.forEach((freq, i) => {
            const osc = audioCtxSorteo.createOscillator();
            const gain = audioCtxSorteo.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, audioCtxSorteo.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtxSorteo.currentTime + i * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtxSorteo.destination);
            osc.start(audioCtxSorteo.currentTime + i * 0.12);
            osc.stop(audioCtxSorteo.currentTime + i * 0.12 + 0.3);
        });
    }

    let vueltas = 0;

    const intervalo = setInterval(() => {

        reproducirTickSorteo();

        const nombreAleatorio = participantes[Math.floor(Math.random() * participantes.length)];
        resultadoSorteo.textContent = nombreAleatorio;

        vueltas++;

        if (vueltas > totalVueltas) {
            clearInterval(intervalo);

            reproducirFanfarriaSorteo();

            const ganador = participantes[Math.floor(Math.random() * participantes.length)];
            resultadoSorteo.textContent = "🎉 Ganador: " + ganador;

            eliminarGanador.dataset.nombre = ganador;
            eliminarGanador.style.display = "inline-block";
        }

    }, 100);

});

const eliminarGanador = document.getElementById("eliminarGanador");

eliminarGanador.addEventListener("click", () => {

    const nombre = eliminarGanador.dataset.nombre;

    const index = participantes.indexOf(nombre);

    if (index !== -1) {
        participantes.splice(index, 1);
        renderParticipantes();
    }

    resultadoSorteo.textContent = "";
    eliminarGanador.style.display = "none";

});

const comunidadLista = document.getElementById("comunidadLista");

function formatearWatchtime(minutos) {

    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const mins = minutos % 60;

    let texto = "";
    if (dias > 0) texto += dias + "d ";
    if (horas > 0) texto += horas + "h ";
    texto += mins + "min";

    return texto;
}

let comunidadDatos = [];
let campoOrden = "puntos";

const buscarComunidad = document.getElementById("buscarComunidad");
const mostrarCantidad = document.getElementById("mostrarCantidad");
let paginaActual = 1;
function renderComunidad() {

    let filtrado = [...comunidadDatos];

    const texto = buscarComunidad.value.trim().toLowerCase();

    if (texto !== "") {
        filtrado = filtrado.filter(u => u.usuario.toLowerCase().includes(texto));
    }

    filtrado.sort((a, b) => b[campoOrden] - a[campoOrden]);

    const usuariosPorPagina = parseInt(mostrarCantidad.value);
const totalPaginas = Math.ceil(filtrado.length / usuariosPorPagina);

if (paginaActual > totalPaginas) {
    paginaActual = 1;
}

const inicio = (paginaActual - 1) * usuariosPorPagina;
const finPagina = inicio + usuariosPorPagina;
const paginaDatos = filtrado.slice(inicio, finPagina);

comunidadLista.innerHTML = "";

paginaDatos.forEach((usuario, index) => {

    comunidadLista.innerHTML += `
    <tr>
        <td>#${inicio + index + 1}</td>
        <td>${usuario.usuario}</td>
        <td>${usuario.mensajes}</td>
        <td>${usuario.nivel}</td>
        <td>${usuario.puntos}</td>
        <td>${formatearWatchtime(usuario.watchtime)}</td>
    </tr>
`;
});

}

buscarComunidad.addEventListener("input", renderComunidad);
mostrarCantidad.addEventListener("change", renderComunidad);

function cargarComunidad() {

    fetch("/api/comunidad")
        .then(response => response.json())
        .then(data => {
            comunidadDatos = data;
            renderComunidad();
        });
}

cargarComunidad();

setInterval(cargarComunidad, 10000);

document.querySelectorAll(".ordenable").forEach((th) => {

    th.addEventListener("click", () => {
        campoOrden = th.dataset.campo;
        renderComunidad();
    });

});
const participantesRuletaVisual = [];

const nombreRuletaVisual = document.getElementById("nombreRuletaVisual");
const agregarRuletaVisual = document.getElementById("agregarRuletaVisual");
const listaRuletaVisual = document.getElementById("listaRuletaVisual");
const ruedaVisual = document.getElementById("ruedaVisual");
const girarRuedaVisual = document.getElementById("girarRuedaVisual");
const resultadoRuedaVisual = document.getElementById("resultadoRuedaVisual");
const barajearRuletaVisual = document.getElementById("barajearRuletaVisual");
const duracionGiroVisual = document.getElementById("duracionGiroVisual");

const coloresRueda = ["#39ff14", "#ff3b3b", "#facc15", "#8b5cf6", "#2ecc71", "#3b82f6", "#ff8c00", "#ec4899", "#06b6d4", "#f472b6", "#a3e635", "#fb923c", "#818cf8", "#facc15", "#f87171", "#34d399"];

function renderListaRuletaVisual() {

    listaRuletaVisual.innerHTML = "";

  participantesRuletaVisual.forEach((nombre, index) => {
        listaRuletaVisual.innerHTML += `
        <li>
            ${escaparHtml(nombre)}
            <button class="eliminarRuletaVisual" data-index="${index}">Eliminar</button>
        </li>
    `;
    });

    dibujarRueda();
}

function dibujarRueda() {

    ruedaVisual.innerHTML = "";

    const total = participantesRuletaVisual.length;

    if (total === 0) {
        ruedaVisual.style.background = "#1a1a1a";
        return;
    }

    const porcion = 360 / total;
    let gradiente = "conic-gradient(";

    participantesRuletaVisual.forEach((nombre, index) => {
        const color = coloresRueda[index % coloresRueda.length];
        const inicio = porcion * index;
        const fin = porcion * (index + 1);
        gradiente += `${color} ${inicio}deg ${fin}deg`;
        if (index < total - 1) gradiente += ", ";
    });

    gradiente += ")";
    ruedaVisual.style.background = gradiente;

const radio = ruedaVisual.offsetWidth / 2;
    const distanciaBase = total > 8 ? radio * 0.72 : radio * 0.58;

    let tamanoFuente = 12;
    let anchoMaximo = 80;

    if (total > 8) {
        tamanoFuente = 10;
        anchoMaximo = 55;
    }
    if (total > 14) {
        tamanoFuente = 8;
        anchoMaximo = 45;
    }

    participantesRuletaVisual.forEach((nombre, index) => {

        const angulo = porcion * index + porcion / 2;
        const anguloRad = angulo * Math.PI / 180;

        const x = Math.sin(anguloRad) * distanciaBase;
        const y = -Math.cos(anguloRad) * distanciaBase;

        const etiqueta = document.createElement("div");
        etiqueta.className = "segmento-etiqueta";
        etiqueta.style.left = `calc(50% + ${x}px)`;
        etiqueta.style.top = `calc(50% + ${y}px)`;
        etiqueta.style.transform = `translate(-50%, -50%)`;
        etiqueta.style.fontSize = `${tamanoFuente}px`;
        etiqueta.style.maxWidth = `${anchoMaximo}px`;
        etiqueta.textContent = nombre;

        ruedaVisual.appendChild(etiqueta);
    });

}

agregarRuletaVisual.addEventListener("click", () => {

    const nombre = nombreRuletaVisual.value.trim();

    if (nombre === "") {
        alert("Escribe un nombre.");
        return;
    }

    participantesRuletaVisual.push(nombre);
    renderListaRuletaVisual();
    nombreRuletaVisual.value = "";

});

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("eliminarRuletaVisual")) {
        const index = parseInt(e.target.dataset.index);
        participantesRuletaVisual.splice(index, 1);
        renderListaRuletaVisual();
    }

});

barajearRuletaVisual.addEventListener("click", () => {

    for (let i = participantesRuletaVisual.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantesRuletaVisual[i], participantesRuletaVisual[j]] = [participantesRuletaVisual[j], participantesRuletaVisual[i]];
    }

    renderListaRuletaVisual();

});

let girando = false;

girarRuedaVisual.addEventListener("click", () => {

    if (girando) return;

    const total = participantesRuletaVisual.length;

    if (total === 0) {
        alert("Agrega al menos un participante.");
        return;
    }

girando = true;
    resultadoRuedaVisual.textContent = "";

    const segundos = parseFloat(duracionGiroVisual.value) || 4;
    const porcion = 360 / total;

    const vueltasExtra = 5 * 360;
    const giroAleatorio = Math.random() * 360;
    const rotacionFinal = vueltasExtra + giroAleatorio;

    ruedaVisual.style.transition = "none";
    ruedaVisual.style.transform = "rotate(0deg)";

    ruedaVisual.offsetHeight;

   ruedaVisual.style.transition = `transform ${segundos}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`;
    ruedaVisual.style.transform = `rotate(${rotacionFinal}deg)`;

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    function reproducirTick() {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.frequency.value = 700;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
    }

    const intervaloTick = setInterval(reproducirTick, 120);

    function reproducirFanfarria() {
        const notas = [523, 659, 784, 1047];
        notas.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.12);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.3);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(audioCtx.currentTime + i * 0.12);
            osc.stop(audioCtx.currentTime + i * 0.12 + 0.3);
        });
    }

    setTimeout(() => {

        const estilo = getComputedStyle(ruedaVisual).transform;
        const matriz = estilo.match(/matrix\(([^)]+)\)/);

        let anguloReal = 0;

        if (matriz) {
            const valores = matriz[1].split(",").map(Number);
            const a = valores[0];
            const b = valores[1];
            anguloReal = Math.atan2(b, a) * (180 / Math.PI);
            if (anguloReal < 0) anguloReal += 360;
        }

        const anguloOriginal = (360 - anguloReal) % 360;
        const indiceGanador = Math.floor(anguloOriginal / porcion) % total;

    clearInterval(intervaloTick);
        reproducirFanfarria();

        const nombreGanador = participantesRuletaVisual[indiceGanador];
        resultadoRuedaVisual.textContent = "🎉 Ganador: " + nombreGanador;

        eliminarGanadorRuleta.dataset.nombre = nombreGanador;
        eliminarGanadorRuleta.style.display = "inline-block";

        girando = false;

    }, segundos * 1000 + 200);

});

const eliminarGanadorRuleta = document.getElementById("eliminarGanadorRuleta");

eliminarGanadorRuleta.addEventListener("click", () => {

    const nombre = eliminarGanadorRuleta.dataset.nombre;

    const index = participantesRuletaVisual.indexOf(nombre);

    if (index !== -1) {
        participantesRuletaVisual.splice(index, 1);
        renderListaRuletaVisual();
    }

    resultadoRuedaVisual.textContent = "";
    eliminarGanadorRuleta.style.display = "none";

});

const btnSugerencias = document.getElementById("btnSugerencias");
const cajaSugerencias = document.getElementById("cajaSugerencias");
const textoSugerencia = document.getElementById("textoSugerencia");
const enviarSugerencia = document.getElementById("enviarSugerencia");

btnSugerencias.addEventListener("click", () => {

    if (cajaSugerencias.style.display === "none") {
        cajaSugerencias.style.display = "block";
    } else {
        cajaSugerencias.style.display = "none";
    }

});

enviarSugerencia.addEventListener("click", () => {

    const texto = textoSugerencia.value.trim();

    if (texto === "") {
        alert("Escribe algo antes de enviar.");
        return;
    }

    fetch("/api/sugerencias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: texto })
    })
        .then(response => response.json())
        .then(() => {
            alert("¡Gracias por tu sugerencia!");
            textoSugerencia.value = "";
            cajaSugerencias.style.display = "none";
        });

});
function cargarSugerencias() {

    fetch("/api/sugerencias")
        .then(response => response.json())
        .then(sugerencias => {

            const listaSugerencias = document.getElementById("listaSugerencias");

            if (sugerencias.length === 0) {
                listaSugerencias.innerHTML = "<p>No hay sugerencias todavía.</p>";
                return;
            }

            listaSugerencias.innerHTML = "";

            sugerencias.forEach(s => {

                const fecha = new Date(s.fecha).toLocaleString();

                listaSugerencias.innerHTML += `
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:10px; margin-bottom:8px;">
                        <p style="margin:0;">${s.texto}</p>
                        <small style="color:#888;">${fecha}</small>
                    </div>
                `;

            });

        });

}
function actualizarEstadoEnVivo() {

    fetch("/api/estado-vivo")
        .then(response => response.json())
        .then(data => {

            const bannerEstado = document.querySelector(".banner-estado");

            if (data.enVivo) {
                bannerEstado.innerHTML = `<span class="punto-en-vivo" style="background:#22c55e;"></span> EN VIVO`;
                bannerEstado.style.color = "#22c55e";
            } else {
                bannerEstado.innerHTML = `<span class="punto-en-vivo" style="background:#ef4444;"></span> Desconectado`;
                bannerEstado.style.color = "#ef4444";
            }

            bannerEstado.style.display = "flex";

        });

}

actualizarEstadoEnVivo();
setInterval(actualizarEstadoEnVivo, 60000);
const nuevoAdminUsuario = document.getElementById("nuevoAdminUsuario");
const nuevoAdminPassword = document.getElementById("nuevoAdminPassword");
const btnCrearAdmin = document.getElementById("btnCrearAdmin");
const listaAdmins = document.getElementById("listaAdmins");

function renderAdmins(admins) {

    listaAdmins.innerHTML = "";

    admins.forEach((admin) => {

    const soyDefault = localStorage.getItem("merrdbot_admin_esDefault") === "true";

        const estado = admin.esDefault
            ? `<span class="usuario-puntos">Default</span>`
            : (soyDefault
                ? (admin.activo
                    ? `<button class="editarUsuario toggleAdmin" data-id="${admin._id}">Activo</button>`
                    : `<button class="eliminarUsuario toggleAdmin" data-id="${admin._id}">Inactivo</button>`)
                : "");

        const lapiz = admin.esDefault
            ? ""
            : `<button class="editarAdminLapiz" data-id="${admin._id}" data-usuario="${admin.usuario}" title="Editar">✏️</button>`;

        listaAdmins.innerHTML += `
            <div class="usuario-item">
                <span class="usuario-nombre">${admin.usuario}</span>
                ${lapiz}
                ${estado}
            </div>
        `;
    });

}

function cargarAdmins() {

    fetch("/api/admins")
        .then(response => response.json())
        .then(admins => renderAdmins(admins));

}

btnCrearAdmin.addEventListener("click", () => {

    const usuario = nuevoAdminUsuario.value.trim();
    const password = nuevoAdminPassword.value.trim();

    if (usuario === "" || password === "") {
        alert("Escribe usuario y contraseña.");
        return;
    }

    fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario, password: password })
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {

            if (status !== 200) {
                alert(data.error || "No se pudo crear el admin.");
                return;
            }

            renderAdmins(data);
            nuevoAdminUsuario.value = "";
            nuevoAdminPassword.value = "";

        });

});

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("toggleAdmin")) {

        const id = e.target.dataset.id;

        fetch(`/api/admins/${id}`, { method: "PATCH" })
            .then(response => response.json().then(data => ({ status: response.status, data })))
            .then(({ status, data }) => {

                if (status !== 200) {
                    alert(data.error || "No se pudo cambiar el estado.");
                    return;
                }

                renderAdmins(data);

            });

    }

});
const modalEditarAdmin = document.getElementById("modalEditarAdmin");
const editarAdminUsuarioInput = document.getElementById("editarAdminUsuarioInput");
const editarAdminPasswordInput = document.getElementById("editarAdminPasswordInput");
const guardarEdicionAdmin = document.getElementById("guardarEdicionAdmin");
const cancelarEdicionAdmin = document.getElementById("cancelarEdicionAdmin");

let idAdminEditando = null;

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("editarAdminLapiz")) {

        idAdminEditando = e.target.dataset.id;
        editarAdminUsuarioInput.value = e.target.dataset.usuario;
        editarAdminPasswordInput.value = "";

        modalEditarAdmin.style.display = "flex";

    }

});

cancelarEdicionAdmin.addEventListener("click", () => {
    modalEditarAdmin.style.display = "none";
    idAdminEditando = null;
});

guardarEdicionAdmin.addEventListener("click", () => {

    const nuevoUsuario = editarAdminUsuarioInput.value.trim();
    const nuevaPassword = editarAdminPasswordInput.value.trim();

    if (nuevoUsuario === "" || nuevaPassword === "") {
        alert("Completa usuario y contraseña.");
        return;
    }

    fetch(`/api/admins/${idAdminEditando}/editar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: nuevoUsuario, password: nuevaPassword })
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {

            if (status !== 200) {
                alert(data.error || "No se pudo editar el admin.");
                return;
            }

            renderAdmins(data);
            modalEditarAdmin.style.display = "none";
            idAdminEditando = null;

        });

});
const listaColaMusica = document.getElementById("listaColaMusica");

let reproductorYT = null;
let colaMusica = [];
let videoActualId = null;

function onYouTubeIframeAPIReady() {

   reproductorYT = new YT.Player("reproductorYoutube", {
        height: "360",
        width: "100%",
        videoId: "",
        events: {
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });

}

function onPlayerStateChange(event) {

    if (event.data === YT.PlayerState.ENDED) {
        siguienteCancion();
    }

}

function onPlayerError(event) {

    console.log("Error al reproducir video, saltando a la siguiente canción. Código:", event.data);
    siguienteCancion();

}

function renderColaMusica() {

    listaColaMusica.innerHTML = "";

    colaMusica.forEach((cancion, index) => {
        listaColaMusica.innerHTML += `
        <li class="cancion-item">
            <span class="cancion-numero">#${index + 1}</span>
            <img src="https://img.youtube.com/vi/${cancion.videoId}/mqdefault.jpg" class="cancion-miniatura">
            <div class="cancion-info">
                <span class="cancion-titulo">${escaparHtml(cancion.titulo)}</span>
                <span class="cancion-pedido">Pedido por ${escaparHtml(cancion.pedidoPor)}</span>
            </div>
        </li>
    `;
    });

}

function cargarColaMusica() {

    fetch("/api/musica/cola")
        .then(response => response.json())
        .then(data => {

            colaMusica = data;
            renderColaMusica();

            if (!videoActualId && colaMusica.length > 0 && reproductorYT && reproductorYT.loadVideoById) {
                reproducirPrimeraCancion();
            }

        });

}

function reproducirPrimeraCancion() {

    if (colaMusica.length === 0) return;

    const primera = colaMusica[0];
    videoActualId = primera._id;

    reproductorYT.loadVideoById(primera.videoId);

}

function siguienteCancion() {

    if (!videoActualId) return;

    fetch(`/api/musica/cola/${videoActualId}`, {
        method: "DELETE"
    })
        .then(response => response.json())
        .then(data => {
            colaMusica = data;
            videoActualId = null;
            renderColaMusica();
            reproducirPrimeraCancion();
        });

}

cargarColaMusica();

setInterval(cargarColaMusica, 15000);

const comandoAutoSorteosInput = document.getElementById("comandoAutoSorteosInput");
const toggleComandoAutoSorteos = document.getElementById("toggleComandoAutoSorteos");
const guardarComandoAutoSorteos = document.getElementById("guardarComandoAutoSorteos");

let comandoAutoSorteosActivo = false;

function pintarToggleSorteos() {
    toggleComandoAutoSorteos.textContent = comandoAutoSorteosActivo ? "Activado" : "Desactivado";
    toggleComandoAutoSorteos.style.backgroundColor = comandoAutoSorteosActivo ? "#39ff14" : "#ff3b3b";
    toggleComandoAutoSorteos.style.color = comandoAutoSorteosActivo ? "#0a0a0a" : "#ffffff";
}

function cargarComandoAutoSorteos() {
    fetch("/api/comando-auto/sorteos")
        .then(response => response.json())
        .then(data => {
            comandoAutoSorteosInput.value = data.comando || "";
            comandoAutoSorteosActivo = data.activo || false;
            pintarToggleSorteos();
        });
}

cargarComandoAutoSorteos();

toggleComandoAutoSorteos.addEventListener("click", () => {
    comandoAutoSorteosActivo = !comandoAutoSorteosActivo;
    pintarToggleSorteos();
});

guardarComandoAutoSorteos.addEventListener("click", () => {
    const comando = comandoAutoSorteosInput.value.trim();
    console.log("ENVIANDO a comando-auto/sorteos:", { comando: comando, activo: comandoAutoSorteosActivo });
    fetch("/api/comando-auto/sorteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comando: comando, activo: comandoAutoSorteosActivo })
    })
        .then(response => response.json())
        .then((data) => {
            console.log("RESPUESTA de comando-auto/sorteos:", data);
            alert("Comando de Sorteos guardado.");
        });
});

const quitarComandoAutoSorteos = document.getElementById("quitarComandoAutoSorteos");

quitarComandoAutoSorteos.addEventListener("click", () => {

    fetch("/api/comando-auto/sorteos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comando: "", activo: false })
    })
        .then(response => response.json())
        .then(() => {
            comandoAutoSorteosInput.value = "";
            comandoAutoSorteosActivo = false;
            pintarToggleSorteos();
            alert("Comando de Sorteos eliminado y desactivado.");
        });

});

const comandoAutoRuletaInput = document.getElementById("comandoAutoRuletaInput");
const toggleComandoAutoRuleta = document.getElementById("toggleComandoAutoRuleta");
const guardarComandoAutoRuleta = document.getElementById("guardarComandoAutoRuleta");

let comandoAutoRuletaActivo = false;

function pintarToggleRuleta() {
    toggleComandoAutoRuleta.textContent = comandoAutoRuletaActivo ? "Activado" : "Desactivado";
    toggleComandoAutoRuleta.style.backgroundColor = comandoAutoRuletaActivo ? "#39ff14" : "#ff3b3b";
    toggleComandoAutoRuleta.style.color = comandoAutoRuletaActivo ? "#0a0a0a" : "#ffffff";
}

function cargarComandoAutoRuleta() {
    fetch("/api/comando-auto/ruleta")
        .then(response => response.json())
        .then(data => {
            comandoAutoRuletaInput.value = data.comando || "";
            comandoAutoRuletaActivo = data.activo || false;
            pintarToggleRuleta();
        });
}

cargarComandoAutoRuleta();

toggleComandoAutoRuleta.addEventListener("click", () => {
    comandoAutoRuletaActivo = !comandoAutoRuletaActivo;
    pintarToggleRuleta();
});

guardarComandoAutoRuleta.addEventListener("click", () => {
    const comando = comandoAutoRuletaInput.value.trim();
    fetch("/api/comando-auto/ruleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comando: comando, activo: comandoAutoRuletaActivo })
    })
        .then(response => response.json())
        .then(() => alert("Comando de Ruleta guardado."));
});

const quitarComandoAutoRuleta = document.getElementById("quitarComandoAutoRuleta");

quitarComandoAutoRuleta.addEventListener("click", () => {

    fetch("/api/comando-auto/ruleta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comando: "", activo: false })
    })
        .then(response => response.json())
        .then(() => {
            comandoAutoRuletaInput.value = "";
            comandoAutoRuletaActivo = false;
            pintarToggleRuleta();
            alert("Comando de Ruleta eliminado y desactivado.");
        });

});

function revisarPendientesSorteo() {
    fetch("/api/sorteos/pendientes")
        .then(response => response.json())
        .then(nombres => {
            if (nombres.length === 0) return;
            nombres.forEach(nombre => {
                if (!participantes.includes(nombre)) {
                    participantes.push(nombre);
                }
            });
            renderParticipantes();
        });
}

function revisarPendientesRuleta() {
    fetch("/api/ruleta/pendientes")
        .then(response => response.json())
        .then(nombres => {
            if (nombres.length === 0) return;
            nombres.forEach(nombre => {
                if (!participantesRuletaVisual.includes(nombre)) {
                    participantesRuletaVisual.push(nombre);
                }
            });
            renderListaRuletaVisual();
        });
}

setInterval(revisarPendientesSorteo, 5000);
setInterval(revisarPendientesRuleta, 5000);

function revisarControlMusica() {
    fetch("/api/musica/control-pendientes")
        .then(response => response.json())
        .then(comandos => {
            comandos.forEach(cmd => {
                if (!reproductorYT) return;
                if (cmd.accion === "pausar") reproductorYT.pauseVideo();
                if (cmd.accion === "reanudar") reproductorYT.playVideo();
                if (cmd.accion === "skip") siguienteCancion();
            });
        });
}

setInterval(revisarControlMusica, 3000);