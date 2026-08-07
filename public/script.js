function escaparHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto;
    return div.innerHTML;
}

const viewerLogin = document.getElementById("viewerLogin");
const viewerPanel = document.getElementById("viewerPanel");
const viewerNombre = document.getElementById("viewerNombre");
const viewerPuntos = document.getElementById("viewerPuntos");
const viewerNivel = document.getElementById("viewerNivel");
const viewerWatchtime = document.getElementById("viewerWatchtime");
const btnViewerLogout = document.getElementById("btnViewerLogout");

function formatearWatchtimeViewer(minutos) {

    const dias = Math.floor(minutos / 1440);
    const horas = Math.floor((minutos % 1440) / 60);
    const mins = minutos % 60;

    let texto = "";
    if (dias > 0) texto += dias + "d ";
    if (horas > 0) texto += horas + "h ";
    texto += mins + "min";

    return texto;
}

function cargarViewer() {

    fetch("/api/viewer/me")
        .then(response => {
            if (!response.ok) {
                throw new Error("No hay sesión");
            }
            return response.json();
        })
        .then(data => {

            viewerNombre.textContent = data.usuario;
            viewerPuntos.textContent = data.puntos.toLocaleString("es-ES");
            viewerNivel.textContent = data.nivel;
            viewerWatchtime.textContent = formatearWatchtimeViewer(data.watchtime);

            viewerLogin.style.display = "none";
            viewerPanel.style.display = "block";

        })
        .catch(() => {
            viewerLogin.style.display = "block";
            viewerPanel.style.display = "none";
        });

}

cargarViewer();

btnViewerLogout.addEventListener("click", () => {

    fetch("/auth/kick/viewer/logout", { method: "POST" })
        .then(() => {
            viewerLogin.style.display = "block";
            viewerPanel.style.display = "none";
        });

});

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

const socket = io();

socket.on("economia-actualizada", (data) => {
    economia = data;
    renderEconomia();
});

let misClips = [];
const clipsLista = document.getElementById("clipsLista");

function renderClips() {

    clipsLista.innerHTML = "";

    if (misClips.length === 0) {
        clipsLista.innerHTML = "<p>Todavía no hay clips.</p>";
        return;
    }

    misClips.forEach((clip) => {
        clipsLista.innerHTML += `
        <div class="usuario-item" style="align-items:flex-start; gap:12px; flex-wrap:wrap;">
       <video src="${clip.rutaVideoVertical}" poster="${clip.miniatura}" controls style="width:140px; border-radius:6px; background:#000;"></video>
            <div style="flex:1; min-width:150px;">
                <p style="margin:0;">${escaparHtml(clip.titulo)}</p>
                <small style="color:#888;">${clip.duracionSegundos}s · ${clip.usuarioCreador}</small>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
               <button class="editarUsuario renombrarClip" data-id="${clip._id}">✏️ Renombrar</button>
             <button class="editarUsuario recortarClip" data-id="${clip._id}" data-duracion="${clip.duracionSegundos}">✂️ Recortar más</button>
                <button class="editarUsuario editarPosicionClip" data-id="${clip._id}" data-zoom="${clip.zoom || 100}" data-offsetx="${clip.offsetX || 0}" data-offsety="${clip.offsetY || 0}">🖼️ Editar posición</button>
              <a href="${clip.rutaVideoVertical}" download class="editarUsuario" style="text-decoration:none; display:inline-block;">⬇️ Descargar</a>
                <button class="eliminarUsuario eliminarClip" data-id="${clip._id}">🗑️ Eliminar</button>
            </div>
        </div>
    `;
    });

}

document.addEventListener("click", (e) => {

    if (e.target.classList.contains("renombrarClip")) {

        const id = e.target.dataset.id;
        const clip = misClips.find(c => c._id === id);
        if (!clip) return;

        const nuevoTitulo = prompt("Nuevo título del clip:", clip.titulo);

        if (nuevoTitulo === null || nuevoTitulo.trim() === "") return;

        fetch(`/api/clips/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo: nuevoTitulo.trim() })
        })
            .then(response => response.json())
            .then((clipActualizado) => {
                const index = misClips.findIndex(c => c._id === id);
                if (index !== -1) misClips[index] = clipActualizado;
                renderClips();
            });

    }

  if (e.target.classList.contains("recortarClip")) {

        const id = e.target.dataset.id;
        const duracionActual = parseFloat(e.target.dataset.duracion);

        const inicioTexto = prompt(`Duración actual: ${duracionActual}s.\n¿Desde qué segundo querés que empiece? (0 = desde el inicio)`, "0");
        if (inicioTexto === null) return;

        const duracionTexto = prompt("¿Cuántos segundos de duración querés?", String(Math.min(duracionActual, 10)));
        if (duracionTexto === null) return;

        const inicioSegundos = parseFloat(inicioTexto);
        const duracionSegundos = parseFloat(duracionTexto);

        if (isNaN(inicioSegundos) || isNaN(duracionSegundos)) {
            alert("Escribe números válidos.");
            return;
        }

        fetch(`/api/clips/${id}/recortar`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inicioSegundos, duracionSegundos })
        })
            .then(response => response.json().then(data => ({ status: response.status, data })))
            .then(({ status, data }) => {

                if (status !== 200) {
                    alert(data.error || "No se pudo recortar el clip.");
                    return;
                }

                const index = misClips.findIndex(c => c._id === id);
                if (index !== -1) misClips[index] = data;
                renderClips();

                alert("Clip recortado correctamente.");

            });

    }

if (e.target.classList.contains("editarPosicionClip")) {

        idClipEditandoPosicion = e.target.dataset.id;

        const clip = misClips.find(c => c._id === idClipEditandoPosicion);
        if (!clip) return;

       sliderZoom.value = clip.zoom || 100;
        sliderOffsetX.value = clip.offsetX || 0;
        sliderOffsetY.value = clip.offsetY || 0;
        sliderSubtitulo.value = clip.subtituloMarginV !== undefined ? clip.subtituloMarginV : 40;

      previaEdicionVideo.src = clip.rutaVideo;
        previaEdicionVideo.load();
        previaEdicionVideo.play().catch(() => {});

        actualizarPreviaEdicion();

        const rutaSrtClip = clip.rutaVideoVertical.replace(".mp4", ".srt");
        cargarSubtitulosPreview(rutaSrtClip);

        modalEditarPosicion.style.display = "flex";

    }

    if (e.target.classList.contains("eliminarClip")) {

        const id = e.target.dataset.id;

        if (!confirm("¿Eliminar este clip? Esta acción no se puede deshacer.")) return;

        fetch(`/api/clips/${id}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(() => {
                misClips = misClips.filter(c => c._id !== id);
                renderClips();
            });

    }

});

function cargarClips() {

    fetch("/api/clips")
        .then(response => response.json())
        .then(data => {
            misClips = data;
            renderClips();
        });

}

cargarClips();

socket.on("clip-nuevo", (clip) => {
    misClips.unshift(clip);
    renderClips();
});

const modalEditarPosicion = document.getElementById("modalEditarPosicion");
const previaEdicionVideo = document.getElementById("previaEdicionVideo");
const sliderZoom = document.getElementById("sliderZoom");
const sliderOffsetX = document.getElementById("sliderOffsetX");
const sliderOffsetY = document.getElementById("sliderOffsetY");
const sliderSubtitulo = document.getElementById("sliderSubtitulo");
const valorZoom = document.getElementById("valorZoom");
const valorOffsetX = document.getElementById("valorOffsetX");
const valorOffsetY = document.getElementById("valorOffsetY");
const valorSubtitulo = document.getElementById("valorSubtitulo");
const guardarEdicionPosicion = document.getElementById("guardarEdicionPosicion");
const cancelarEdicionPosicion = document.getElementById("cancelarEdicionPosicion");

let idClipEditandoPosicion = null;
let subtitulosPreviewActuales = [];

function tiempoSrtASegundos(texto) {
    const partes = texto.split(",");
    const [horas, minutos, segundos] = partes[0].split(":").map(Number);
    const milisegundos = parseInt(partes[1]);
    return horas * 3600 + minutos * 60 + segundos + milisegundos / 1000;
}

function parsearSrt(contenidoSrt) {

    const bloques = contenidoSrt.trim().split(/\n\s*\n/);

    return bloques.map((bloque) => {

        const lineas = bloque.split("\n");
        const lineaTiempo = lineas.find(l => l.includes("-->"));

        if (!lineaTiempo) return null;

        const [inicioTexto, finTexto] = lineaTiempo.split("-->").map(s => s.trim());
        const texto = lineas.slice(lineas.indexOf(lineaTiempo) + 1).join(" ").trim();

        return {
            inicio: tiempoSrtASegundos(inicioTexto),
            fin: tiempoSrtASegundos(finTexto),
            texto: texto
        };

    }).filter(Boolean);

}

function cargarSubtitulosPreview(rutaSrt) {

    subtitulosPreviewActuales = [];
    previaEdicionSubtitulo.textContent = "";

    fetch(rutaSrt)
        .then(response => {
            if (!response.ok) throw new Error("Sin subtítulos");
            return response.text();
        })
        .then(contenidoSrt => {
            subtitulosPreviewActuales = parsearSrt(contenidoSrt);
        })
        .catch(() => {
            subtitulosPreviewActuales = [];
        });

}

const previaEdicionSubtitulo = document.getElementById("previaEdicionSubtitulo");

previaEdicionVideo.addEventListener("timeupdate", () => {

    const tiempoActual = previaEdicionVideo.currentTime;

    const subtituloActivo = subtitulosPreviewActuales.find(
        s => tiempoActual >= s.inicio && tiempoActual <= s.fin
    );

    previaEdicionSubtitulo.textContent = subtituloActivo ? subtituloActivo.texto : "";

});

function actualizarPreviaEdicion() {

    const zoom = parseFloat(sliderZoom.value);
    const offsetX = parseFloat(sliderOffsetX.value);
    const offsetY = parseFloat(sliderOffsetY.value);

   const margenSubtitulo = parseFloat(sliderSubtitulo.value);

    valorZoom.textContent = zoom;
    valorOffsetX.textContent = offsetX;
    valorOffsetY.textContent = offsetY;
    valorSubtitulo.textContent = margenSubtitulo;

    previaEdicionSubtitulo.style.bottom = `${margenSubtitulo / 5}px`;

const escalaPreview = 150 / 1080;
    const desplazX = offsetX * escalaPreview;
    const desplazY = offsetY * escalaPreview;

    previaEdicionVideo.style.transform = `translate(-50%, -50%) translate(${desplazX}px, ${desplazY}px) scale(${zoom / 100})`;

}

[sliderZoom, sliderOffsetX, sliderOffsetY, sliderSubtitulo].forEach((slider) => {
    slider.addEventListener("input", actualizarPreviaEdicion);
});

cancelarEdicionPosicion.addEventListener("click", () => {
    modalEditarPosicion.style.display = "none";
    idClipEditandoPosicion = null;
});

guardarEdicionPosicion.addEventListener("click", () => {

    if (!idClipEditandoPosicion) return;

const zoom = parseFloat(sliderZoom.value);
    const offsetX = parseFloat(sliderOffsetX.value);
    const offsetY = parseFloat(sliderOffsetY.value);
    const subtituloMarginV = parseFloat(sliderSubtitulo.value);

    guardarEdicionPosicion.disabled = true;
    guardarEdicionPosicion.textContent = "Guardando (puede tardar)...";

    fetch(`/api/clips/${idClipEditandoPosicion}/reposicionar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoom, offsetX, offsetY, subtituloMarginV })
    })
        .then(response => response.json().then(data => ({ status: response.status, data })))
        .then(({ status, data }) => {

            guardarEdicionPosicion.disabled = false;
            guardarEdicionPosicion.textContent = "Guardar cambios";

            if (status !== 200) {
                alert(data.error || "No se pudo reposicionar el clip.");
                return;
            }

            const index = misClips.findIndex(c => c._id === idClipEditandoPosicion);
            if (index !== -1) misClips[index] = data;
            renderClips();

            modalEditarPosicion.style.display = "none";
            idClipEditandoPosicion = null;

        });

});

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

    dibujarRueda();
}

const importarEconomia = document.getElementById("importarEconomia");

const modalPuntosMinimos = document.getElementById("modalPuntosMinimos");
const puntosMinimosInput = document.getElementById("puntosMinimosInput");
const confirmarPuntosMinimos = document.getElementById("confirmarPuntosMinimos");
const cancelarPuntosMinimos = document.getElementById("cancelarPuntosMinimos");

const btnSincronizarSorteos = document.getElementById("btnSincronizarSorteos");
const dropdownSincronizarSorteos = document.getElementById("dropdownSincronizarSorteos");

btnSincronizarSorteos.addEventListener("click", () => {
    dropdownSincronizarSorteos.style.display = dropdownSincronizarSorteos.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", (e) => {

    if (!btnSincronizarSorteos.contains(e.target) && !dropdownSincronizarSorteos.contains(e.target)) {
        dropdownSincronizarSorteos.style.display = "none";
    }

});

let origenImportacion = "economia";

importarEconomia.addEventListener("click", () => {

    if (economia.length === 0) {
        alert("No hay usuarios en Economía todavía.");
        return;
    }

    origenImportacion = "economia";
    puntosMinimosInput.value = "";
    modalPuntosMinimos.style.display = "flex";
    dropdownSincronizarSorteos.style.display = "none";

});

cancelarPuntosMinimos.addEventListener("click", () => {
    modalPuntosMinimos.style.display = "none";
});

const importarComunidad = document.getElementById("importarComunidad");

importarComunidad.addEventListener("click", () => {

    if (comunidadDatos.length === 0) {
        alert("No hay usuarios en Comunidad todavía.");
        return;
    }

    origenImportacion = "comunidad";
    puntosMinimosInput.value = "";
    modalPuntosMinimos.style.display = "flex";
    dropdownSincronizarSorteos.style.display = "none";

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

    usuariosFiltrados.forEach((usuario) => {
        if (!participantes.includes(usuario.usuario)) {
            participantes.push(usuario.usuario);
        }
    });

    renderParticipantes();

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
const ruedaVisual = document.getElementById("ruedaVisual");
const girarRuedaVisual = document.getElementById("girarRuedaVisual");
const resultadoRuedaVisual = document.getElementById("resultadoRuedaVisual");
const barajearRuletaVisual = document.getElementById("barajearRuletaVisual");
const duracionGiroVisual = document.getElementById("duracionGiroVisual");

const coloresRueda = ["#39ff14", "#ff3b3b", "#facc15", "#8b5cf6", "#2ecc71", "#3b82f6", "#ff8c00", "#ec4899", "#06b6d4", "#f472b6", "#a3e635", "#fb923c", "#818cf8", "#facc15", "#f87171", "#34d399"];

function dibujarRueda() {

    ruedaVisual.innerHTML = "";

    const total = participantes.length;

    if (total === 0) {
        ruedaVisual.style.background = "#1a1a1a";
        return;
    }

    const porcion = 360 / total;
    let gradiente = "conic-gradient(";

    participantes.forEach((nombre, index) => {
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

    participantes.forEach((nombre, index) => {

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

barajearRuletaVisual.addEventListener("click", () => {

    for (let i = participantes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantes[i], participantes[j]] = [participantes[j], participantes[i]];
    }

    renderParticipantes();

});

let girando = false;

girarRuedaVisual.addEventListener("click", () => {

   if (girando) return;

    const participantesSnapshot = [...participantes];
    const total = participantesSnapshot.length;

    if (total === 0) {
        alert("Agrega al menos un participante.");
        return;
    }

    girando = true;
    resultadoRuedaVisual.textContent = "";

    const segundos = parseFloat(duracionGiroVisual.value) || 4;
    const porcion = 360 / total;

    // ⚠️ SOLO PARA PRUEBA LOCAL — borrar este bloque para volver a la normalidad
    const NOMBRE_EXCLUIDO_PRUEBA = "Merdo";
    let indiceForzado = null;
    if (participantesSnapshot.includes(NOMBRE_EXCLUIDO_PRUEBA)) {
        const opciones = participantesSnapshot
            .map((nombre, i) => ({ nombre, i }))
            .filter(o => o.nombre !== NOMBRE_EXCLUIDO_PRUEBA);
        indiceForzado = opciones[Math.floor(Math.random() * opciones.length)].i;
    }
    // ⚠️ FIN DEL BLOQUE DE PRUEBA

    const vueltasExtra = 5 * 360;

    let giroAleatorio;
    if (indiceForzado !== null) {
        // apunta al centro del segmento elegido (el puntero está arriba, en 0°)
        const centroSegmento = porcion * indiceForzado + porcion / 2;
        const margen = porcion * 0.3;
        const variacion = (Math.random() * margen * 2) - margen;
        giroAleatorio = (360 - centroSegmento + variacion + 360) % 360;
    } else {
        giroAleatorio = Math.random() * 360;
    }

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

        console.log("--- DIAGNÓSTICO RULETA ---");
        console.log("participantes:", participantes);
        console.log("total:", total, "| porcion:", porcion);
        console.log("anguloReal:", anguloReal);
        console.log("anguloOriginal:", anguloOriginal);
        console.log("indiceGanador calculado:", indiceGanador, "-> nombre:", participantes[indiceGanador]);

        clearInterval(intervaloTick);
        reproducirFanfarria();

     let nombreGanador = participantesSnapshot[indiceGanador];

        // ⚠️ SOLO PARA PRUEBA LOCAL — borrar este bloque para volver a la normalidad
        const NOMBRE_EXCLUIDO_PRUEBA = "Merdo";
        if (nombreGanador === NOMBRE_EXCLUIDO_PRUEBA) {
            const opciones = participantesSnapshot.filter(n => n !== NOMBRE_EXCLUIDO_PRUEBA);
            nombreGanador = opciones[Math.floor(Math.random() * opciones.length)];
        }
        // ⚠️ FIN DEL BLOQUE DE PRUEBA

        resultadoRuedaVisual.textContent = "🎉 Ganador: " + nombreGanador;

        eliminarGanadorRuleta.dataset.nombre = nombreGanador;
        eliminarGanadorRuleta.style.display = "inline-block";

        girando = false;

    }, segundos * 1000 + 200);

});

const eliminarGanadorRuleta = document.getElementById("eliminarGanadorRuleta");

eliminarGanadorRuleta.addEventListener("click", () => {

    const nombre = eliminarGanadorRuleta.dataset.nombre;

    const index = participantes.indexOf(nombre);

    if (index !== -1) {
        participantes.splice(index, 1);
        renderParticipantes();
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
                    <div style="background:#1a1a1a; border:1px solid #333; border-radius:8px; padding:10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                        <div>
                            <p style="margin:0;">${escaparHtml(s.texto)}</p>
                            <small style="color:#888;">${fecha}</small>
                        </div>
                        <button class="eliminarSugerencia" data-id="${s._id}" style="background:#ff3b3b; color:#fff; border:none; border-radius:6px; padding:6px 10px; cursor:pointer; font-size:14px;">🗑️</button>
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
const nuevoAdminUsuarioKick = document.getElementById("nuevoAdminUsuarioKick");
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

       const lapiz = `<button class="editarAdminLapiz" data-id="${admin._id}" data-usuario="${admin.usuario}" data-usuariokick="${admin.usuarioKick || ""}" title="Editar">✏️</button>`;

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
    const usuarioKick = nuevoAdminUsuarioKick.value.trim();

    if (usuario === "" || password === "") {
        alert("Escribe usuario y contraseña.");
        return;
    }

    fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuario, password: password, usuarioKick: usuarioKick })
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
            nuevoAdminUsuarioKick.value = "";

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
const editarAdminUsuarioKickInput = document.getElementById("editarAdminUsuarioKickInput");
const guardarEdicionAdmin = document.getElementById("guardarEdicionAdmin");
const cancelarEdicionAdmin = document.getElementById("cancelarEdicionAdmin");

let idAdminEditando = null;

document.addEventListener("click", (e) => {

   if (e.target.classList.contains("editarAdminLapiz")) {

        idAdminEditando = e.target.dataset.id;
        editarAdminUsuarioInput.value = e.target.dataset.usuario;
        editarAdminPasswordInput.value = "";
        editarAdminUsuarioKickInput.value = e.target.dataset.usuariokick || "";

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

   const nuevoUsuarioKick = editarAdminUsuarioKickInput.value.trim();

    fetch(`/api/admins/${idAdminEditando}/editar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: nuevoUsuario, password: nuevaPassword, usuarioKick: nuevoUsuarioKick })
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
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
            onError: onPlayerError
        }
    });

}

function onPlayerReady(event) {
    event.target.mute();
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

            const musicaVaciaImagen = document.getElementById("musicaVaciaImagen");
            const reproductorYoutubeContenedor = document.getElementById("reproductorYoutubeContenedor");
            const botonActivarSonido = document.getElementById("botonActivarSonido");

            if (colaMusica.length === 0) {
                musicaVaciaImagen.style.display = "block";
                reproductorYoutubeContenedor.style.display = "none";
                botonActivarSonido.style.display = "none";
            } else {
                musicaVaciaImagen.style.display = "none";
                reproductorYoutubeContenedor.style.display = "block";
                botonActivarSonido.style.display = "inline-block";
            }

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

const botonActivarSonido = document.getElementById("botonActivarSonido");

if (botonActivarSonido) {
    botonActivarSonido.addEventListener("click", () => {
        if (reproductorYT && reproductorYT.unMute) {
            reproductorYT.unMute();
            reproductorYT.playVideo();
        }
        botonActivarSonido.style.display = "none";
    });
}

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
                if (!participantes.includes(nombre)) {
                    participantes.push(nombre);
                }
            });
            renderParticipantes();
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
                if (cmd.accion === "volumen") reproductorYT.setVolume(cmd.valor);
                if (cmd.accion === "subirvolumen") {
                    const nuevoVolumen = Math.min(reproductorYT.getVolume() + 10, 100);
                    reproductorYT.setVolume(nuevoVolumen);
                }
                if (cmd.accion === "bajarvolumen") {
                    const nuevoVolumen = Math.max(reproductorYT.getVolume() - 10, 0);
                    reproductorYT.setVolume(nuevoVolumen);
                }
            });
        });
}

setInterval(revisarControlMusica, 3000);
const puntosPorMinutoInput = document.getElementById("puntosPorMinutoInput");
const xpPorMinutoInput = document.getElementById("xpPorMinutoInput");
const guardarConfigWatchtime = document.getElementById("guardarConfigWatchtime");

function cargarConfigWatchtime() {
    fetch("/api/config-watchtime")
        .then(response => response.json())
        .then(data => {
            puntosPorMinutoInput.value = data.puntosPorMinuto;
            xpPorMinutoInput.value = data.xpPorMinuto;
        });
}

cargarConfigWatchtime();

guardarConfigWatchtime.addEventListener("click", () => {

    const puntosPorMinuto = parseInt(puntosPorMinutoInput.value);
    const xpPorMinuto = parseInt(xpPorMinutoInput.value);

    if (isNaN(puntosPorMinuto) || isNaN(xpPorMinuto)) {
        alert("Escribe números válidos.");
        return;
    }

    fetch("/api/config-watchtime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntosPorMinuto: puntosPorMinuto, xpPorMinuto: xpPorMinuto })
    })
        .then(response => response.json())
        .then(() => alert("Configuración guardada."));

});
document.addEventListener("click", (e) => {

    if (e.target.classList.contains("eliminarSugerencia")) {

        const id = e.target.dataset.id;

        fetch(`/api/sugerencias/${id}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(() => cargarSugerencias());

    }

});
const modoInstantaneoBtn = document.getElementById("modoInstantaneoBtn");
const modoRuletaBtn = document.getElementById("modoRuletaBtn");
const panelInstantaneo = document.getElementById("panelInstantaneo");
const panelRuleta = document.getElementById("panelRuleta");

modoInstantaneoBtn.addEventListener("click", () => {
    modoInstantaneoBtn.classList.add("modo-activo");
    modoRuletaBtn.classList.remove("modo-activo");
    panelInstantaneo.style.display = "block";
    panelRuleta.style.display = "none";
});

modoRuletaBtn.addEventListener("click", () => {
    modoRuletaBtn.classList.add("modo-activo");
    modoInstantaneoBtn.classList.remove("modo-activo");
    panelRuleta.style.display = "block";
    panelInstantaneo.style.display = "none";
});
const btnSonidoOviedo = document.getElementById("btnSonidoOviedo");

btnSonidoOviedo.addEventListener("click", () => {
    const audio = new Audio("/oviedo-sound.mp3");
    audio.play();
});
const introBienvenida = document.getElementById("introBienvenida");
const introStage = document.getElementById("introStage");
const introLampToggle = document.getElementById("introLampToggle");

if (sessionStorage.getItem("introVista") === "true") {
    introBienvenida.style.display = "none";
} else {
    fetch("/api/viewer/me")
        .then(response => {
            if (response.ok) {
                cerrarIntro();
            }
        })
        .catch(() => {});
}

introLampToggle.addEventListener("click", () => {
    introStage.classList.toggle("on");
});

function cerrarIntro() {
    sessionStorage.setItem("introVista", "true");
    introBienvenida.style.display = "none";
}

const btnIntroContinuar = document.getElementById("btnIntroContinuar");
btnIntroContinuar.addEventListener("click", cerrarIntro);

const btnIntroAdminLogin = document.getElementById("btnIntroAdminLogin");
const introAdminUsuario = document.getElementById("introAdminUsuario");
const introAdminPassword = document.getElementById("introAdminPassword");
const introAdminError = document.getElementById("introAdminError");
const introAdminExito = document.getElementById("introAdminExito");

btnIntroAdminLogin.addEventListener("click", () => {

    const usuario = introAdminUsuario.value.trim();
    const password = introAdminPassword.value.trim();

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
            introAdminError.style.display = "none";
            introAdminExito.style.display = "block";
        })
        .catch(() => {
            introAdminExito.style.display = "none";
            introAdminError.style.display = "block";
        });

});