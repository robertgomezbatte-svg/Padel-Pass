/* Padel Pass MVP (web estática)
   - Carga JSON de /data
   - Renderiza páginas: home, pass, events, players, player
*/

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const DATA = {};
const pages = {
  home: initHome,
  pass: initPass,
  events: initEvents,
  players: initPlayers,
  player: initPlayerProfile,
};

boot();

async function boot(){
  setYear();
  initTheme();

  await loadAllData();

  const page = window.PADEL_PAGE || "home";
  if (pages[page]) pages[page]();
}

function setYear(){
  const el = $("#year");
  if (el) el.textContent = new Date().getFullYear();
}

function initTheme(){
  const key = "pp_theme";
  const current = localStorage.getItem(key) || "light";
  document.documentElement.dataset.theme = current;

  const btn = $("#themeToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem(key, next);
  });
}

async function loadAllData(){
  const files = ["config", "levels", "players", "events", "matches"];
  for (const f of files){
    DATA[f] = await fetchJSON(`data/${f}.json`);
  }
}

async function fetchJSON(path){
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`No se pudo cargar ${path}`);
  return res.json();
}

/* ---------- helpers de negocio ---------- */

function pointsToLevel(levels, points){
  // levels: array of {level, requiredTotal}
  // Retorna nivel actual (1..30) según puntos totales
  let lvl = 1;
  for (const row of levels){
    if (points >= row.requiredTotal) lvl = row.level;
  }
  return lvl;
}

function nextLevelInfo(levels, points){
  const current = pointsToLevel(levels, points);
  const currentRow = levels.find(x => x.level === current);
  const nextRow = levels.find(x => x.level === current + 1);

  const currentFloor = currentRow ? currentRow.requiredTotal : 0;
  const nextTarget = nextRow ? nextRow.requiredTotal : currentFloor;

  const progress = nextRow
    ? clamp((points - currentFloor) / (nextTarget - currentFloor), 0, 1)
    : 1;

  return {
    current,
    currentFloor,
    nextTarget,
    progress,
    isMax: !nextRow
  };
}

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function winrate(p){
  const total = (p.wins || 0) + (p.losses || 0);
  if (!total) return 0;
  return (p.wins / total) * 100;
}

function formatDateTime(iso){
  const d = new Date(iso);
  return d.toLocaleString("es-ES", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
}

/* ---------- render UI ---------- */

function el(tag, attrs={}, children=[]){
  const node = document.createElement(tag);
  for (const [k,v] of Object.entries(attrs)){
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const c of children){
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

function progressBar(pct){
  const wrap = el("div", { class:"progress" });
  const bar = el("div");
  bar.style.width = `${Math.round(pct*100)}%`;
  wrap.appendChild(bar);
  return wrap;
}

/* ---------- HOME ---------- */

function initHome(){
  const { players, events, levels, config } = DATA;

  // Stats
  const totalPlayers = players.length;
  const totalEvents = events.length;
  const totalMatches = DATA.matches.length;

  const statsEl = $("#homeStats");
  if (statsEl){
    statsEl.innerHTML = "";
    statsEl.appendChild(statCard("JUGADORES", totalPlayers));
    statsEl.appendChild(statCard("EVENTOS", totalEvents));
    statsEl.appendChild(statCard("PARTIDOS", totalMatches));
  }

  // Upcoming events
  const upcoming = events
    .slice()
    .sort((a,b)=> new Date(a.datetime) - new Date(b.datetime))
    .slice(0, 4);

  const upEl = $("#upcomingEvents");
  if (upEl){
    upEl.innerHTML = "";
    for (const e of upcoming) upEl.appendChild(eventItem(e));
  }

  // Top players
  const top = players
    .slice()
    .sort((a,b)=> b.points - a.points)
    .slice(0, 6);

  const tbody = $("#topPlayersTable tbody");
  if (tbody){
    tbody.innerHTML = "";
    top.forEach((p, idx) => {
      const lvl = pointsToLevel(levels, p.points);
      const tr = el("tr", {}, [
        el("td", {}, [String(idx+1)]),
        el("td", {}, [playerLink(p)]),
        el("td", {}, [String(lvl)]),
        el("td", {}, [String(p.points)]),
        el("td", {}, [`${p.wins}-${p.losses}`]),
      ]);
      tbody.appendChild(tr);
    });
  }

  // Featured progress (el #1)
  const featured = top[0] || players[0];
  const fp = $("#featuredProgress");
  if (fp && featured){
    const info = nextLevelInfo(levels, featured.points);
    fp.innerHTML = "";
    fp.appendChild(el("div", { class:"kpi-row" }, [
      kpi("JUGADOR", featured.name),
      kpi("NIVEL", String(info.current)),
      kpi("PUNTOS", String(featured.points)),
    ]));
    fp.appendChild(el("div", { style:"height:12px" }));
    fp.appendChild(el("div", { class:"muted small" }, [
      info.isMax
        ? "Máximo nivel alcanzado."
        : `Siguiente nivel: ${info.current + 1} · Objetivo: ${info.nextTarget} pts`
    ]));
    fp.appendChild(el("div", { style:"height:10px" }));
    fp.appendChild(progressBar(info.progress));
    fp.appendChild(el("div", { style:"height:12px" }));
    fp.appendChild(el("a", { class:"btn ghost", href:`player.html?id=${encodeURIComponent(featured.id)}` }, ["Ver perfil →"]));
  }

  // Monthly missions (demo del config)
  const missionsEl = $("#monthlyMissions");
  if (missionsEl){
    missionsEl.innerHTML = "";
    for (const m of config.monthlyMissions){
      missionsEl.appendChild(missionCard(m, false));
    }
  }
}

function statCard(label, value){
  return el("div", { class:"stat" }, [
    el("div", { class:"k" }, [label]),
    el("div", { class:"v" }, [String(value)])
  ]);
}

/* ---------- PASS ---------- */

function initPass(){
  const { players, levels } = DATA;

  const select = $("#playerSelect");
  if (select){
    select.innerHTML = "";
    players
      .slice()
      .sort((a,b)=> b.points - a.points)
      .forEach(p => {
        select.appendChild(el("option", { value: p.id }, [p.name]));
      });

    // default: top 1
    renderPassFor(select.value);

    select.addEventListener("change", () => renderPassFor(select.value));
  } else {
    renderPassFor(players[0]?.id);
  }

  function renderPassFor(playerId){
    const p = players.find(x => x.id === playerId) || players[0];
    const info = nextLevelInfo(levels, p.points);

    const progressEl = $("#passProgress");
    if (progressEl){
      progressEl.innerHTML = "";
      progressEl.appendChild(el("div", { class:"kpi-row" }, [
        kpi("JUGADOR", p.name),
        kpi("NIVEL", String(info.current)),
        kpi("PUNTOS", String(p.points)),
      ]));

      progressEl.appendChild(el("div", { style:"height:12px" }));
      progressEl.appendChild(el("div", { class:"muted small" }, [
        info.isMax
          ? "Máximo nivel alcanzado."
          : `Siguiente nivel: ${info.current + 1} · Te faltan ${info.nextTarget - p.points} pts`
      ]));
      progressEl.appendChild(el("div", { style:"height:10px" }));
      progressEl.appendChild(progressBar(info.progress));
    }

    const grid = $("#levelsGrid");
    if (grid){
      grid.innerHTML = "";
      for (const row of levels){
        const isUnlocked = p.points >= row.requiredTotal;
        const isCurrent = row.level === info.current;

        const reward = row.reward ? row.reward : "—";
        const cls = [
          "level",
          isUnlocked ? "unlocked" : "lock",
          isCurrent ? "current" : ""
        ].join(" ").trim();

        grid.appendChild(el("div", { class: cls }, [
          el("div", { class:"level-top" }, [
            el("div", {}, [
              el("div", { class:"level-num" }, [`Nivel ${row.level}`]),
              el("div", { class:"level-points" }, [`Requiere: ${row.requiredTotal} pts`]),
            ]),
            el("span", { class:"badge" }, [isUnlocked ? "Desbloqueado" : "Bloqueado"])
          ]),
          el("div", { class:"level-reward" }, [
  el("span", { class:"badge reward-badge" }, ["Recompensa"]),
  el("span", { class:"reward-text" }, [reward])
])
        ]));
      }
    }
  }
}

/* ---------- EVENTS ---------- */

function initEvents(){
  const { events } = DATA;
  const list = $("#eventsList");
  const input = $("#eventSearch");

  const sorted = events
    .slice()
    .sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));

  const render = (q="") => {
    const qn = q.trim().toLowerCase();
    const filtered = !qn ? sorted : sorted.filter(e =>
      (e.type + " " + e.club + " " + e.location + " " + e.datetime).toLowerCase().includes(qn)
    );

    list.innerHTML = "";
    filtered.forEach(e => list.appendChild(eventItem(e)));
    if (!filtered.length){
      list.appendChild(el("div", { class:"muted" }, ["No hay eventos que coincidan."]));
    }
  };

  render("");
  if (input) input.addEventListener("input", () => render(input.value));
}

function eventItem(e){
  return el("div", { class:"item" }, [
    el("div", { class:"item-left" }, [
      el("div", { class:"item-title" }, [`${e.type} · ${e.title}`]),
      el("div", { class:"item-sub" }, [`${formatDateTime(e.datetime)} · ${e.club} · ${e.location}`]),
    ]),
    el("div", { class:"item-right" }, [
      el("span", { class:"badge" }, [`${e.price_eur}€`]),
      el("span", { class:"muted small" }, [`Plazas: ${e.spots_left}/${e.spots_total}`]),
    ])
  ]);
}

/* ---------- PLAYERS ---------- */

function initPlayers(){
  const { players, levels } = DATA;

  const tbody = $("#playersTable tbody");
  const search = $("#playerSearch");
  const sort = $("#sortPlayers");

  const compute = (p) => {
    const lvl = pointsToLevel(levels, p.points);
    const wr = winrate(p);
    const matches = (p.wins||0)+(p.losses||0);
    return { ...p, lvl, wr, matches };
  };

  const base = players.map(compute);

  const sorters = {
    points_desc: (a,b)=> b.points - a.points,
    level_desc: (a,b)=> b.lvl - a.lvl || b.points - a.points,
    winrate_desc: (a,b)=> b.wr - a.wr || b.points - a.points,
    matches_desc: (a,b)=> b.matches - a.matches || b.points - a.points
  };

  const render = () => {
    const q = (search?.value || "").trim().toLowerCase();
    const s = sort?.value || "points_desc";

    let rows = base.slice();
    if (q){
      rows = rows.filter(p => (p.name + " " + (p.club||"")).toLowerCase().includes(q));
    }
    rows.sort(sorters[s]);

    tbody.innerHTML = "";
    rows.forEach((p, idx) => {
      const tr = el("tr", {}, [
        el("td", {}, [String(idx+1)]),
        el("td", {}, [playerLink(p)]),
        el("td", {}, [String(p.lvl)]),
        el("td", {}, [String(p.points)]),
        el("td", {}, [`${p.wins}-${p.losses}`]),
        el("td", {}, [`${p.wr.toFixed(1)}%`]),
        el("td", {}, [p.club || "—"]),
      ]);
      tbody.appendChild(tr);
    });
  };

  render();
  search?.addEventListener("input", render);
  sort?.addEventListener("change", render);
}

function playerLink(p){
  const a = el("a", { class:"link", href:`player.html?id=${encodeURIComponent(p.id)}` }, [p.name]);
  return a;
}

/* ---------- PLAYER PROFILE ---------- */

function initPlayerProfile(){
  const { players, levels, matches, config } = DATA;

  const params = new URLSearchParams(location.search);
  const id = params.get("id") || players[0]?.id;
  const p = players.find(x => x.id === id) || players[0];

  const head = $("#playerHead");
  const lvlInfo = nextLevelInfo(levels, p.points);

  if (head){
    head.innerHTML = "";
    head.appendChild(el("div", {}, [
      el("h1", {}, [p.name]),
      el("p", { class:"muted" }, [`Club: ${p.club || "—"} · Nivel ${lvlInfo.current} · ${p.points} pts`]),
    ]));
    head.appendChild(el("div", { class:"page-actions" }, [
      el("a", { class:"btn ghost", href:"players.html" }, ["← Volver a jugadores"]),
      el("a", { class:"btn", href:"pass.html" }, ["Ver pase"]),
    ]));
  }

  const prog = $("#playerProgress");
  if (prog){
    prog.innerHTML = "";
    prog.appendChild(el("div", { class:"muted small" }, [
      lvlInfo.isMax
        ? "Máximo nivel alcanzado."
        : `Siguiente nivel: ${lvlInfo.current + 1} · Objetivo: ${lvlInfo.nextTarget} pts · Te faltan ${lvlInfo.nextTarget - p.points} pts`
    ]));
    prog.appendChild(el("div", { style:"height:10px" }));
    prog.appendChild(progressBar(lvlInfo.progress));
    prog.appendChild(el("div", { style:"height:14px" }));
    prog.appendChild(el("div", { class:"kpi-row" }, [
      kpi("VICTORIAS", String(p.wins)),
      kpi("DERROTAS", String(p.losses)),
      kpi("WINRATE", `${winrate(p).toFixed(1)}%`),
    ]));
  }

  const stats = $("#playerStats");
  if (stats){
    const total = (p.wins||0)+(p.losses||0);
    stats.innerHTML = "";
    stats.appendChild(el("div", { class:"kpi-row" }, [
      kpi("PARTIDOS", String(total)),
      kpi("RACHA (demo)", p.streak || "—"),
      kpi("MEJOR RESULTADO (demo)", p.best || "—"),
    ]));
  }

  const missions = $("#playerMissions");
  if (missions){
    missions.innerHTML = "";
    // demo: marca completadas según flags del player
    for (const m of config.monthlyMissions){
      const done = !!(p.monthlyDone || []).includes(m.id);
      missions.appendChild(missionCard(m, done));
    }
  }
     // LOGROS (10 huecos) + 1 medalla en Robert
  const ag = $("#achievementsGrid");
  if (ag){
    ag.innerHTML = "";
    const isRobert = String(p.id).toLowerCase() === "robert" || String(p.name).toLowerCase().includes("robert");

    for (let i = 0; i < 10; i++){
      const slot = el("div", { class: "achievement-slot" });
      if (isRobert && i === 0){
        slot.classList.add("filled");
        slot.textContent = "🌞";
      }
      ag.appendChild(slot);
    }
  }

  const list = $("#playerMatches");
  if (list){
    const recent = matches
      .filter(x => x.players.includes(p.id))
      .slice()
      .sort((a,b)=> new Date(b.datetime) - new Date(a.datetime))
      .slice(0, 8);

    list.innerHTML = "";
    for (const m of recent){
      const isWin = m.winner === p.id;
      list.appendChild(el("div", { class:"item" }, [
        el("div", { class:"item-left" }, [
          el("div", { class:"item-title" }, [
            `${isWin ? "Victoria" : "Derrota"} · ${m.score} · ${m.type}`
          ]),
          el("div", { class:"item-sub" }, [
            `${formatDateTime(m.datetime)} · ${m.club} · vs ${opponentsLabel(m, p.id)}`
          ]),
        ]),
        el("div", { class:"item-right" }, [
          el("span", { class:"badge" }, [`${m.pointsEarned[p.id] || 0} pts`]),
          el("span", { class:"muted small" }, [m.note || ""])
        ])
      ]));
    }
    if (!recent.length){
      list.appendChild(el("div", { class:"muted" }, ["Aún no hay partidos registrados para este jugador."]));
    }
  }
}

function opponentsLabel(match, pid){
  const ids = match.players.filter(x => x !== pid);
  const names = ids.map(id => (DATA.players.find(p => p.id === id)?.name || id));
  return names.join(", ");
}

function kpi(k, v){
  return el("div", { class:"kpi" }, [
    el("div", { class:"k" }, [k]),
    el("div", { class:"v" }, [v]),
  ]);
}

function missionCard(m, done){
  return el("div", { class:"mission" }, [
    el("h3", {}, [m.title]),
    el("div", { class:"muted small" }, [m.desc]),
    el("div", { style:"height:10px" }),
    el("div", { class:"meta" }, [
      el("span", {}, [`+${m.points} pts`]),
      el("span", { class: done ? "done" : "" }, [done ? "Completado" : "Pendiente"]),
    ])
  ]);
}
