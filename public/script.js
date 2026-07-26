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

function renderEconomia() {

    economiaLista.innerHTML = "";

    economia.forEach((usuario, index) => {
        economiaLista.innerHTML += `
        <div class="usuario-item">
            <span class="usuario-numero">#${index + 1}</span>
            <span class="usuario-nombre">${usuario.usuario}</span>
            <span class="usuario-puntos">${usuario.puntos} pts</span>
            <button class="editarUsuario" data-nombre="${usuario.usuario}">Editar</button>
            <button class="eliminarUsuario" data-nombre="${usuario.usuario}">Eliminar</button>
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

const ADMIN_USER = "Maykel";
const ADMIN_PASS = "12345";

let adminAutenticado = false;

btnAdminLogin.addEventListener("click", () => {

    const usuario = adminUsuario.value.trim();
    const password = adminPassword.value.trim();

    if (usuario === ADMIN_USER && password === ADMIN_PASS) {
        adminAutenticado = true;
        adminLogin.style.display = "none";
        adminPanel.style.display = "block";
        adminError.style.display = "none";
        alert("Bienvenido, " + usuario + ". Acceso de administrador concedido.");
    } else {
        adminError.style.display = "block";
    }

});

document.addEventListener("click", (e) => {

   if (e.target.classList.contains("eliminarUsuario")) {

        if (!adminAutenticado) {
            alert("Solo un administrador puede eliminar usuarios.");
            return;
        }

        const nombre = e.target.dataset.nombre;

        fetch(`/api/economia/${encodeURIComponent(nombre)}`, {
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

        const nombre = e.target.dataset.nombre;

        const usuario = economia.find(u => u.usuario === nombre);

        if (!usuario) {
            return;
        }

        const nuevoNombre = prompt("Nuevo nombre:", usuario.usuario);

        if (nuevoNombre === null || nuevoNombre.trim() === "") {
            return;
        }

        const nuevosPuntos = prompt("Nuevos puntos:", usuario.puntos);

        if (nuevosPuntos === null || isNaN(parseInt(nuevosPuntos))) {
            return;
        }

        fetch(`/api/economia/${encodeURIComponent(nombre)}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                nombre: nuevoNombre.trim(),
                puntos: parseInt(nuevosPuntos)
            })
        })
            .then(response => response.json())
            .then(data => {
                economia = data;
                renderEconomia();
            });
    }

});