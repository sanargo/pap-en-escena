import Papa from 'papaparse';
import MalteseCross from "./assets/maltese-cross.svg";
import { CATEGORIES, DEFAULT_SCENARIOS, PROTOCOLS } from "./data.js";

const SHEET_CSV_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vQrIPEamdKYi37bmBawHawThglTGDfOtWIx80Z0OBpUBuYy09CTtKitw9hhAwAKKOac2hmTNowG8ghe/pub?gid=627161382&single=true&output=csv";



// Arreglo de trabajo que usa toda la app. Empieza con el respaldo y, si la hoja de cálculo carga bien, se reemplaza por su contenido.
let SCENARIOS = DEFAULT_SCENARIOS;

const CATEGORIAS_VALIDAS = Object.keys(CATEGORIES);
const PROTOCOLOS_VALIDOS = ["ACERCARSE", "ABCDE"];
const NIVELES_VALIDOS = ["correcto", "parcial", "incorrecto"];

function filasAEscenarios(filas) {
const porId = new Map();
const orden = [];

filas.forEach((row) => {
    const id = (row.id_escenario || "").trim();
    if (!id) return;
    const categoria = (row.categoria || "").trim();
    const protocolo = (row.protocolo || "").trim();
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
    console.warn(
        `Fila de "${id}" ignorada: categoría "${categoria}" no reconocida.`,
    );
    return;
    }
    if (!PROTOCOLOS_VALIDOS.includes(protocolo)) {
    console.warn(
        `Fila de "${id}" ignorada: protocolo "${protocolo}" no reconocido.`,
    );
    return;
    }

    const opciones = [];
    for (let i = 1; i <= 4; i++) {
    const texto = (row["opcion" + i + "_texto"] || "").trim();
    if (!texto) continue;
    const nivel = (row["opcion" + i + "_nivel"] || "").trim();
    if (!NIVELES_VALIDOS.includes(nivel)) {
        console.warn(
        `Fila de "${id}", opción ${i} ignorada: nivel "${nivel}" no reconocido.`,
        );
        continue;
    }
    opciones.push({
        texto,
        nivel_acierto: nivel,
        retroalimentacion: (row["opcion" + i + "_retro"] || "").trim(),
    });
    }
    if (opciones.length < 2) {
    console.warn(
        `Fila de "${id}" ignorada: necesita al menos 2 opciones válidas.`,
    );
    return;
    }

    if (!porId.has(id)) {
    porId.set(id, {
        id,
        titulo: (row.titulo || "").trim(),
        categoria,
        protocolo_asociado: protocolo,
        cierre: "",
        _momentos: [],
    });
    orden.push(id);
    }
    const escenario = porId.get(id);
    const numero =
    parseInt(row.numero_momento, 10) || escenario._momentos.length + 1;
    escenario._momentos.push({
    numero,
    narrativa: (row.narrativa || "").trim(),
    opciones,
    });
    const cierre = (row.cierre || "").trim();
    if (cierre) escenario.cierre = cierre;
});

const resultado = [];
orden.forEach((id) => {
    const e = porId.get(id);
    e._momentos.sort((a, b) => a.numero - b.numero);
    const momentos = e._momentos.map((m) => ({
    narrativa: m.narrativa,
    opciones: m.opciones,
    }));
    if (momentos.length === 0) return;
    resultado.push({
    id: e.id,
    titulo: e.titulo,
    categoria: e.categoria,
    protocolo_asociado: e.protocolo_asociado,
    momentos,
    cierre: e.cierre,
    });
});
return resultado;
}

function cargarEscenariosDesdeHoja() {
if (!SHEET_CSV_URL || typeof Papa === "undefined") return;
fetch(SHEET_CSV_URL)
    .then((res) => {
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.text();
    })
    .then((texto) => {
    const parsed = Papa.parse(texto, {
        header: true,
        skipEmptyLines: true,
    });
    const escenarios = filasAEscenarios(parsed.data);
    if (escenarios.length === 0) {
        console.warn(
        "La hoja no produjo ningún escenario válido; se mantiene el respaldo.",
        );
        return;
    }
    SCENARIOS = escenarios;
    if (state.view === "home") render();
    })
    .catch((err) => {
    console.warn(
        "No se pudo cargar la hoja de escenarios, se mantiene el respaldo:",
        err,
    );
    });
}



let state = {
view: "home",
filter: "todas",
scenarioId: null,
momentoIndex: 0,
chosenIndex: null,
protocolTab: "ACERCARSE",
};

function render() {
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(buildHeader());
    if (state.view === "home") app.appendChild(buildHome());
    else if (state.view === "scenario") app.appendChild(buildScenario());
    else if (state.view === "protocols") app.appendChild(buildProtocols());
    app.appendChild(buildFooter());
}

function buildHeader() {
    const header = document.createElement("header");
    header.className = "topbar";
    header.innerHTML = `
    <div class="topbar-container">
        <img src="${MalteseCross}" alt="Logo">    
        <div class="topbar__title-container">
            <p class="brand-sub">CUERPO DE BOMBEROS • COLOMBIA</p>
            <h1 class="brand">PAP - PRIMEROS AUXILIOS PSICOLÓGICOS</h1>
        </div>
    </div>
    <nav class="toplinks">
        <button data-nav="home">Escenarios</button>
        <button data-nav="protocols">Protocolos</button>
    </nav>
    `;
    header.querySelector('[data-nav="home"]').onclick = () => {
        state.view = "home";
        render();
    };
    header.querySelector('[data-nav="protocols"]').onclick = () => {
        state.view = "protocols";
        render();
    };
    return header;
}

function buildFooter() {
  const f = document.createElement("footer");
  f.className = "foot";

  const izquierda = document.createElement("span");
  izquierda.textContent = "FORMACIÓN PAP • BOMBEROS COLOMBIA";

  const derecha = document.createElement("span");
  derecha.textContent = "Developed by Santiago Arias";

  f.appendChild(izquierda);
  f.appendChild(derecha);
  return f;
}

function buildHome() {
    const frag = document.createElement("section");
    frag.className = "view-content-landing";
    const intro = document.createElement("div");
    intro.className = "intro";
    intro.innerHTML = `
    <div class="module">
    <span class="module__lightbulb"></span>
    <span>MÓDULO DE FORMACIÓN</span>
    </div>
    <h2>ESCENARIOS DE PRÁCTICA</h2>
    <div class="note__line"></div>
    <p>Cada escenario recrea situaciones reales dentro del cuerpo de Bomberos. Elige la respuesta que consideres más adecuada y recibe retroalimentación basada en los principios del PAP.</p>
    <div class="note__decorative-cross">
    <img src="${MalteseCross}" alt="Logo">   
    </div>
    `;
    frag.appendChild(intro);
    
    const chips = document.createElement("div");
    chips.className = "chips";
    const allCats = ["todas", ...Object.keys(CATEGORIES)];
    allCats.forEach((cat) => {
        const btn = document.createElement("button");
        btn.className = "chip" + (state.filter === cat ? " active" : "");
        btn.textContent = cat === "todas" ? "Todas" : CATEGORIES[cat].label;
        btn.onclick = () => {
            state.filter = cat;
            render();
        };
        chips.appendChild(btn);
    });
    frag.appendChild(chips);
    
    const grid = document.createElement("div");
    grid.className = "grid";
    const list =
    state.filter === "todas"
    ? SCENARIOS
    : SCENARIOS.filter((s) => s.categoria === state.filter);
    list.forEach((s) => {
        const cat = CATEGORIES[s.categoria];
        const card = document.createElement("button");
        card.className = "card";
        card.style.setProperty("--cat-color", cat.color);
        card.innerHTML = `
        <span class="cat-label">${cat.label}</span>
        <h4>${s.titulo}</h4>
        <span class="protocol-badge">Protocolo: ${s.protocolo_asociado}</span>
        `;
        card.onclick = () => {
            state.view = "scenario";
            state.scenarioId = s.id;
            state.momentoIndex = 0;
            state.chosenIndex = null;
            render();
        };
        grid.appendChild(card);
    });
    frag.appendChild(grid);
    
    return frag;
}

function buildScenario() {
    const s = SCENARIOS.find((x) => x.id === state.scenarioId);
    const cat = CATEGORIES[s.categoria];
    const frag = document.createElement("section");
    frag.className = "view-content-scenario";
    
    const nav = document.createElement("div")
    nav.className = "bar"
    frag.appendChild(nav)
    
    const back = document.createElement("button");
    back.className = "back-btn";
    back.textContent = "‹ Volver a escenarios";
    back.onclick = () => {
        state.view = "home";
        render();
    };
    nav.appendChild(back);
    
    const totalMomentos = s.momentos.length;
    if (totalMomentos > 1) {
        const progreso = document.createElement("div");
        progreso.className = "moments";
        progreso.textContent = `Momento ${state.momentoIndex + 1} de ${totalMomentos}`;
        nav.appendChild(progreso);
    }
    
    const head = document.createElement("div");
    head.className = "view-content-scenario__information";
    head.style.setProperty("--cat-color", cat.color);
    head.innerHTML = `
    <div>
    <span class="badge-cat">${cat.label}</span>
    <span class="badge-prot">${s.protocolo_asociado}</span>
    </div>
    <span class="lightbulb"></span>
    <h2 class="prompt">${s.titulo}</h2>
    `;
    frag.appendChild(head);
    
    const momento = s.momentos[state.momentoIndex];
    
    const report = document.createElement("div");
    report.className = "report-box";
    report.innerHTML = `<span class="report-label">Reporte de escena</span><p>${momento.narrativa}</p>`;
    head.appendChild(report);
    
    const ch = document.createElement("div")
    ch.className = "view-content-scenario__options"
    frag.appendChild(ch)
    
    const q = document.createElement("h2");
    q.className = "prompt";
    q.textContent = "¿Qué haces?";
    ch.appendChild(q);
    
    const opts = document.createElement("div");
    opts.className = "options";
    const letters = ["A", "B", "C", "D"];
    momento.opciones.forEach((op, i) => {
        const row = document.createElement("button");
        row.className = "option-row";
        row.style.setProperty("--cat-color", cat.color);
        if (state.chosenIndex !== null) {
            row.disabled = true;
            if (i === state.chosenIndex)
                row.classList.add("chosen", op.nivel_acierto);
            else row.classList.add("unchosen");
        }
        row.innerHTML = `<span class="marker">${letters[i]}</span><span>${op.texto}</span>`;
        row.onclick = () => {
            if (state.chosenIndex === null) {
                state.chosenIndex = i;
                render();
            }
        };
        opts.appendChild(row);
    });
    ch.appendChild(opts);
    
    if (state.chosenIndex !== null) {
        const chosen = momento.opciones[state.chosenIndex];
        const fb = document.createElement("div");
        fb.className = "feedback " + chosen.nivel_acierto;
        fb.style.setProperty("--cat-color", cat.color);
        const verdictLabel =
        chosen.nivel_acierto === "correcto"
        ? "Correcto"
        : chosen.nivel_acierto === "parcial"
        ? "Parcial"
        : "Incorrecto";
        fb.innerHTML = `<div class="verdict ${chosen.nivel_acierto}">${verdictLabel}</div><p>${chosen.retroalimentacion}</p>`;
        opts.appendChild(fb);
        
        const esUltimoMomento = state.momentoIndex === totalMomentos - 1;
        
        if (!esUltimoMomento) {
            const actions = document.createElement("div");
            actions.className = "actions";
            const siguienteMomento = document.createElement("button");
            siguienteMomento.className = "primary";
            siguienteMomento.textContent = "Siguiente momento";
            siguienteMomento.onclick = () => {
                state.momentoIndex += 1;
                state.chosenIndex = null;
                render();
                window.scrollTo(0, 0);
            };
            actions.appendChild(siguienteMomento);
            frag.appendChild(actions);
            return frag;
        }
        
        const cierre = document.createElement("div");
        cierre.className = "closure";
        cierre.innerHTML = `<strong>Para llevar:</strong> ${s.cierre}`;
        opts.appendChild(cierre);
        
        const actions = document.createElement("div");
        actions.className = "actions";
        
        const verProtocolo = document.createElement("button");
        verProtocolo.textContent = "Ver protocolo completo";
        verProtocolo.onclick = () => {
            state.view = "protocols";
            state.protocolTab = s.protocolo_asociado;
            render();
        };
        actions.appendChild(verProtocolo);
        
        const currentIdx = SCENARIOS.findIndex((x) => x.id === s.id);
        if (currentIdx < SCENARIOS.length - 1) {
            const next = document.createElement("button");
            next.className = "primary";
            next.textContent = "Siguiente escenario";
            next.onclick = () => {
                state.scenarioId = SCENARIOS[currentIdx + 1].id;
                state.momentoIndex = 0;
                state.chosenIndex = null;
                render();
                window.scrollTo(0, 0);
            };
            actions.appendChild(next);
        }
        
        const menu = document.createElement("button");
        menu.textContent = "Volver al menú";
        menu.onclick = () => {
            state.view = "home";
            render();
        };
        actions.appendChild(menu);
        
        frag.appendChild(actions);
    }
    
    return frag;
}

function buildProtocols() {
    const frag = document.createElement("div");
    frag.className = "view-content-protocols";
    const tabs = document.createElement("div");
    tabs.className = "protocol-tabs";
    Object.keys(PROTOCOLS).forEach((key) => {
        const btn = document.createElement("button");
        btn.textContent = key;
        btn.className = state.protocolTab === key ? "active" : "";
        btn.onclick = () => {
            state.protocolTab = key;
            render();
        };
        tabs.appendChild(btn);
    });
    frag.appendChild(tabs);
    
    const p = PROTOCOLS[state.protocolTab];
    
    const note = document.createElement("div");
    note.className = "note";
    note.innerHTML = `<strong>Fuente:</strong> ${p.fuente}. ${p.nota}`;
    frag.appendChild(note);
    
    const list = document.createElement("ol");
    list.className = "protocol-steps";
    p.pasos.forEach((paso) => {
        const li = document.createElement("li");
        li.innerHTML = `<div><span class="step-name">${paso.nombre}</span><span class="step-desc">${paso.desc}</span></div>`;
        list.appendChild(li);
    });
    frag.appendChild(list);
    
    return frag;
}

render();
cargarEscenariosDesdeHoja();
