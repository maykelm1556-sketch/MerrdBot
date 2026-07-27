const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".tab-panel");

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

    economia.forEach((usuario, index) => {
        economiaLista.innerHTML += `
        <div class="usuario-item">
            <span class="usuario-numero">#${index + 1}</span>
            <span class="usuario-nombre">${usuario.usuario}</span>
            <span class="usuario-puntos">${usuario.puntos} pts</span>
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
        .then(response => {
            if (response.ok) {
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

importarEconomia.addEventListener("click", () => {

    if (economia.length === 0) {
        alert("No hay usuarios en Economía todavía.");
        return;
    }

    economia.forEach((usuario) => {
        if (!participantes.includes(usuario.usuario)) {
            participantes.push(usuario.usuario);
        }
    });

    renderParticipantes();

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

    let vueltas = 0;

    const intervalo = setInterval(() => {

        const nombreAleatorio = participantes[Math.floor(Math.random() * participantes.length)];
        resultadoSorteo.textContent = nombreAleatorio;

        vueltas++;

        if (vueltas > totalVueltas) {
            clearInterval(intervalo);

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

function cargarComunidad() {

    fetch("/api/comunidad")
        .then(response => response.json())
        .then(data => {

            comunidadLista.innerHTML = "";

            data.forEach((usuario) => {

                const fecha = new Date(usuario.ultimaActividad).toLocaleString();

                comunidadLista.innerHTML += `
    <div class="usuario-card">
        <div class="usuario-header">
            <h3>${usuario.usuario}</h3>
            <span class="nivel">⭐ Nivel ${usuario.nivel}</span>
            <div class="xp-bar">
    <div class="xp-fill" style="width:${usuario.xp}%"></div>
</div>
        </div>

        <div class="usuario-info">
            <p>💬 ${usuario.mensajes} mensajes</p>
            <p>🕒 ${fecha}</p>
        </div>
    </div>
`;
            });
        });
}

cargarComunidad();

setInterval(cargarComunidad, 10000);