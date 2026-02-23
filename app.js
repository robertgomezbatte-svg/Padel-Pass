/* app.js */
/* Padel Pass MVP (web estática)
   - Carga JSON de /data
   - Renderiza páginas: home, pass, events, players, player, register, admin
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  updateDoc,
  deleteField,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ FALTABA ESTO (Auth)
import {
  getAuth,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

// 🔹 Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyD3y1nQH3mw0b0zY2lqv5Z7yS7nDq1Jc1A",
  authDomain: "padel-pass.firebaseapp.com",
  projectId: "padel-pass",
  storageBucket: "padel-pass.appspot.com",
  messagingSenderId: "390197286333",
  appId: "1:390197286333:web:2bfae3b8b2e7c42bc0b0a1",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Inicializar Auth y loguearse anónimo
const auth = getAuth(app);
signInAnonymously(auth).catch((error) => {
  console.error("Error auth:", error);
});

// Helpers DOM
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const fmt = {
  date(d) {
    const dt = new Date(d);
    return dt.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  },
  num(n) {
    return new Intl.NumberFormat("es-ES").format(n);
  },
};

// Estado
let DATA = {
  events: [],
  players: [],
  pass: [],
  missions: [],
};

// 🔹 Carga de datos desde JSON
async function loadAllData() {
  const [events, players, pass, missions] = await Promise.all([
    fetch("data/events.json").then((r) => r.json()),
    fetch("data/players.json").then((r) => r.json()),
    fetch("data/pass.json").then((r) => r.json()),
    fetch("data/missions.json").then((r) => r.json()),
  ]);

  DATA = { events, players, pass, missions };
}

// Páginas
const pages = {
  home() {
    renderHome();
  },
  pass() {
    renderPass();
  },
  events() {
    renderEvents();
  },
  players() {
    renderPlayers();
  },
  player() {
    renderPlayerProfile();
  },
  register() {
    initRegister();
  },
  admin() {
    initAdmin();
  },
};

// BOOT
(async function main() {
  try {
    await boot();
  } catch (err) {
    console.error(err);
    const el = $("#app");
    if (el) {
      el.innerHTML = `<div class="wrap section"><div class="card"><div class="bd"><b>Error</b><p class="help">${String(
        err
      )}</p></div></div></div>`;
    }
  }
})();

async function boot() {
  setYear();
  initTheme();
  initNav();

  await loadAllData();

  const page = window.PADEL_PAGE || "home";
  if (pages[page]) pages[page]();
}

function setYear() {
  const el = $("#year");
  if (el) el.textContent = new Date().getFullYear();
}

function initTheme() {
  const key = "pp_theme";
  const current = localStorage.getItem(key) || "light";
  document.documentElement.dataset.theme = current;

  const btn = $("#themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(key, next);
  });
}

function initNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("siteNav");
  const backdrop = document.getElementById("navBackdrop");
  if (!toggle || !nav || !backdrop) return;

  const close = () => {
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    backdrop.hidden = true;
  };

  const open = () => {
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    backdrop.hidden = false;
  };

  const isOpen = () => document.body.classList.contains("nav-open");

  toggle.addEventListener("click", () => {
    if (isOpen()) close();
    else open();
  });

  backdrop.addEventListener("click", close);

  nav.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (a) close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) close();
  });
}

// HOME
function renderHome() {
  const upcoming = [...DATA.events]
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);

  const topPlayers = [...DATA.players]
    .sort((a, b) => (b.points || 0) - (a.points || 0))
    .slice(0, 5);

  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <div class="wrap section">
      <div class="hero">
        <div class="card hero-card">
          <h1 class="hero-title">Tu pase al pádel competitivo.</h1>
          <p class="hero-sub">Sigue tu progreso, sube niveles, desbloquea recompensas y entra en los eventos que se vienen.</p>
          <div class="hero-actions">
            <a class="btn primary" href="events.html">Ver eventos</a>
            <a class="btn" href="players.html">Ranking</a>
            <a class="btn ghost" href="pass.html">Pase</a>
          </div>
          <div class="hero-badges">
            <span class="pill"><b>${fmt.num(DATA.players.length)}</b> jugadores</span>
            <span class="pill"><b>${fmt.num(DATA.events.length)}</b> eventos</span>
            <span class="pill"><b>30</b> niveles</span>
          </div>
        </div>

        <div class="card hero-card">
          <div class="kpi">
            <div class="box">
              <div class="n">${fmt.num(
                DATA.players.reduce((acc, p) => acc + (p.matches || 0), 0)
              )}</div>
              <div class="t">Partidos registrados</div>
            </div>
            <div class="box">
              <div class="n">${fmt.num(
                DATA.players.reduce((acc, p) => acc + (p.wins || 0), 0)
              )}</div>
              <div class="t">Victorias</div>
            </div>
            <div class="box">
              <div class="n">${fmt.num(
                DATA.events.filter((e) => e.status === "open").length
              )}</div>
              <div class="t">Inscripción abierta</div>
            </div>
            <div class="box">
              <div class="n">${fmt.num(
                DATA.events.filter((e) => e.status === "closed").length
              )}</div>
              <div class="t">Cerrados</div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-top:18px">
        <div class="card">
          <div class="hd"><b>Próximos eventos</b></div>
          <div class="bd">
            <div class="list">
              ${upcoming
                .map(
                  (e) => `
                <div class="item">
                  <div class="l">
                    <div class="t">${e.title}</div>
                    <div class="m">${fmt.date(e.date)} · ${e.location}</div>
                  </div>
                  <div class="r">
                    <span class="badge ${
                      e.status === "open" ? "ok" : "warn"
                    }"><span class="dot"></span>${e.status}</span>
                    <a class="btn" href="events.html">Ver</a>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="hd"><b>Top jugadores</b></div>
          <div class="bd">
            <div class="list">
              ${topPlayers
                .map(
                  (p, idx) => `
                <div class="item">
                  <div class="l">
                    <div class="t">#${idx + 1} · ${p.name}</div>
                    <div class="m">${p.club || "—"} · ${
                    p.level || "—"
                  }</div>
                  </div>
                  <div class="r">
                    <span class="pill"><b>${fmt.num(
                      p.points || 0
                    )}</b> pts</span>
                    <a class="btn" href="player.html?id=${encodeURIComponent(
                      p.id
                    )}">Perfil</a>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// PASS
function renderPass() {
  const app = $("#app");
  if (!app) return;

  app.innerHTML = `
    <div class="wrap section">
      <div class="card">
        <div class="hd">
          <b>Pase — 30 niveles</b>
          <div class="help">Demo de progresión y recompensas</div>
        </div>
        <div class="bd">
          <div class="levels">
            ${DATA.pass
              .map((lvl) => {
                const pct = Math.max(
                  0,
                  Math.min(100, Number(lvl.progress || 0))
                );
                return `
                  <div class="level">
                    <div class="h">
                      <b>Nivel ${lvl.level}</b>
                      <span>${pct}%</span>
                    </div>
                    <div class="help">${lvl.reward}</div>
                    <div class="progress"><i style="width:${pct}%"></i></div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

// EVENTS
function renderEvents() {
  const app = $("#app");
  if (!app) return;

  const state = {
    q: "",
    status: "all",
  };

  const render = () => {
    const filtered = DATA.events
      .filter((e) => {
        if (state.status !== "all" && e.status !== state.status) return false;
        const hay = `${e.title} ${e.location}`.toLowerCase();
        return hay.includes(state.q.toLowerCase());
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    app.innerHTML = `
      <div class="wrap section">
        <div class="card">
          <div class="hd">
            <b>Eventos</b>
            <div class="help">Busca y filtra (demo)</div>
          </div>
          <div class="bd">
            <div class="filters" style="margin-bottom:12px">
              <input id="q" placeholder="Buscar por nombre o ciudad..." value="${
                state.q
              }" />
              <button class="chip ${state.status === "all" ? "active" : ""}" data-status="all">Todos</button>
              <button class="chip ${state.status === "open" ? "active" : ""}" data-status="open">Open</button>
              <button class="chip ${
                state.status === "closed" ? "active" : ""
              }" data-status="closed">Closed</button>
            </div>

            <div class="list">
              ${filtered
                .map(
                  (e) => `
                  <div class="item">
                    <div class="l">
                      <div class="t">${e.title}</div>
                      <div class="m">${fmt.date(e.date)} · ${
                    e.location
                  } · ${e.format}</div>
                    </div>
                    <div class="r">
                      <span class="badge ${
                        e.status === "open" ? "ok" : "warn"
                      }"><span class="dot"></span>${e.status}</span>
                      <span class="pill"><b>${fmt.num(
                        e.slots
                      )}</b> plazas</span>
                    </div>
                  </div>
                `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    `;

    $("#q").addEventListener("input", (ev) => {
      state.q = ev.target.value;
      render();
    });

    $$(".chip").forEach((b) =>
      b.addEventListener("click", () => {
        state.status = b.dataset.status;
        render();
      })
    );
  };

  render();
}

// PLAYERS
function renderPlayers() {
  const app = $("#app");
  if (!app) return;

  const state = {
    q: "",
  };

  const render = () => {
    const filtered = DATA.players
      .filter((p) => {
        const hay = `${p.name} ${p.club || ""}`.toLowerCase();
        return hay.includes(state.q.toLowerCase());
      })
      .sort((a, b) => (b.points || 0) - (a.points || 0));

    app.innerHTML = `
      <div class="wrap section">
        <div class="card">
          <div class="hd">
            <b>Jugadores</b>
            <div class="help">Ranking con búsqueda (demo)</div>
          </div>
          <div class="bd">
            <div class="filters" style="margin-bottom:12px">
              <input id="q" placeholder="Buscar jugador o club..." value="${
                state.q
              }" />
            </div>

            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Jugador</th>
                    <th>Club</th>
                    <th>Nivel</th>
                    <th>Pts</th>
                    <th>W-L</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  ${filtered
                    .map((p, idx) => {
                      const wins = p.wins || 0;
                      const losses = (p.matches || 0) - wins;
                      return `
                        <tr>
                          <td><b>${idx + 1}</b></td>
                          <td>
                            <div class="player-card">
                              <div class="avatar"></div>
                              <div class="meta">
                                <b>${p.name}</b>
                                <span>${p.handle || ""}</span>
                              </div>
                            </div>
                          </td>
                          <td>${p.club || "—"}</td>
                          <td>${p.level || "—"}</td>
                          <td><b>${fmt.num(p.points || 0)}</b></td>
                          <td>${wins}-${losses}</td>
                          <td><a class="btn" href="player.html?id=${encodeURIComponent(
                            p.id
                          )}">Perfil</a></td>
                        </tr>
                      `;
                    })
                    .join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;

    $("#q").addEventListener("input", (ev) => {
      state.q = ev.target.value;
      render();
    });
  };

  render();
}

// PLAYER PROFILE
function renderPlayerProfile() {
  const app = $("#app");
  if (!app) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const p = DATA.players.find((x) => String(x.id) === String(id)) || DATA.players[0];

  if (!p) {
    app.innerHTML = `<div class="wrap section"><div class="card"><div class="bd"><b>No encontrado</b></div></div></div>`;
    return;
  }

  const wins = p.wins || 0;
  const matches = p.matches || 0;
  const losses = Math.max(0, matches - wins);
  const winrate = matches ? Math.round((wins / matches) * 100) : 0;

  app.innerHTML = `
    <div class="wrap section">
      <div class="grid-2">
        <div class="card">
          <div class="bd">
            <div class="player-card">
              <div class="avatar" style="width:54px;height:54px;border-radius:18px"></div>
              <div class="meta">
                <b style="font-size:18px">${p.name}</b>
                <span>${p.handle || ""} · ${p.club || "—"}</span>
              </div>
            </div>

            <div class="grid-3" style="margin-top:14px">
              <div class="card" style="box-shadow:none">
                <div class="bd">
                  <div class="t help">Nivel</div>
                  <div class="n" style="font-weight:900;font-size:22px">${p.level || "—"}</div>
                </div>
              </div>
              <div class="card" style="box-shadow:none">
                <div class="bd">
                  <div class="t help">Puntos</div>
                  <div class="n" style="font-weight:900;font-size:22px">${fmt.num(
                    p.points || 0
                  )}</div>
                </div>
              </div>
              <div class="card" style="box-shadow:none">
                <div class="bd">
                  <div class="t help">Winrate</div>
                  <div class="n" style="font-weight:900;font-size:22px">${winrate}%</div>
                </div>
              </div>
            </div>

            <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
              <span class="badge ok"><span class="dot"></span>${wins} wins</span>
              <span class="badge bad"><span class="dot"></span>${losses} losses</span>
              <span class="pill"><b>${matches}</b> partidos</span>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="hd"><b>Objetivos mensuales (demo)</b></div>
          <div class="bd">
            <div class="list">
              ${(DATA.missions || [])
                .slice(0, 5)
                .map(
                  (m) => `
                <div class="item">
                  <div class="l">
                    <div class="t">${m.title}</div>
                    <div class="m">${m.desc}</div>
                  </div>
                  <div class="r">
                    <span class="pill"><b>${m.reward}</b></span>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// REGISTER (demo)
function initRegister() {
  const form = $("#registerForm");
  const out = $("#registerOut");
  if (!form || !out) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#name").value.trim();
    const club = $("#club").value.trim();
    const handle = $("#handle").value.trim();

    if (!name) {
      out.innerHTML = `<span class="badge bad"><span class="dot"></span>Nombre requerido</span>`;
      return;
    }

    // Demo: guarda en Firestore (colección registrations)
    const id = `${Date.now()}`;
    await setDoc(doc(db, "registrations", id), {
      id,
      name,
      club,
      handle,
      createdAt: new Date().toISOString(),
    });

    out.innerHTML = `<span class="badge ok"><span class="dot"></span>Registrado</span>`;
    form.reset();
  });
}

// ADMIN
async function initAdmin() {
  const tableBody = $("#adminTableBody");
  const btnReload = $("#adminReload");
  const btnClear = $("#adminClear");
  const out = $("#adminOut");

  if (!tableBody) return;

  const load = async () => {
    tableBody.innerHTML = `<tr><td colspan="5">Cargando...</td></tr>`;
    const snap = await getDocs(collection(db, "registrations"));
    const rows = snap.docs.map((d) => d.data()).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    if (!rows.length) {
      tableBody.innerHTML = `<tr><td colspan="5">Sin registros</td></tr>`;
      return;
    }

    tableBody.innerHTML = rows
      .map(
        (r) => `
        <tr>
          <td><b>${r.name || "—"}</b></td>
          <td>${r.handle || "—"}</td>
          <td>${r.club || "—"}</td>
          <td>${fmt.date(r.createdAt || new Date().toISOString())}</td>
          <td>
            <button class="btn ghost" data-del="${r.id}">Borrar</button>
          </td>
        </tr>
      `
      )
      .join("");

    $$("button[data-del]").forEach((b) =>
      b.addEventListener("click", async () => {
        const id = b.dataset.del;
        await deleteDoc(doc(db, "registrations", id));
        if (out)
          out.innerHTML = `<span class="badge warn"><span class="dot"></span>Registro eliminado</span>`;
        load();
      })
    );
  };

  if (btnReload) btnReload.addEventListener("click", load);

  if (btnClear)
    btnClear.addEventListener("click", async () => {
      const snap = await getDocs(collection(db, "registrations"));
      await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
      if (out)
        out.innerHTML = `<span class="badge warn"><span class="dot"></span>Todo eliminado</span>`;
      load();
    });

  await load();
}
