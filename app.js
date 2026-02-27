const STORAGE_KEY = "report-gara-calcio-v1";

const defaultState = {
  match: {
    homeTeam: "Casa",
    awayTeam: "Ospite",
    date: "",
    time: "",
    stadium: "",
    referee: "",
  },
  lineups: {
    home: [],
    away: [],
  },
  events: [],
};

const eventLabels = {
  goal: "Gol",
  yellow: "Ammonizione",
  red: "Espulsione",
  substitution: "Sostituzione",
  penaltyMissed: "Rigore sbagliato",
};

let state = loadState();

const matchForm = document.querySelector("#match-form");
const homeLineupForm = document.querySelector("#home-lineup-form");
const awayLineupForm = document.querySelector("#away-lineup-form");
const eventForm = document.querySelector("#event-form");
const homeLineupList = document.querySelector("#home-lineup");
const awayLineupList = document.querySelector("#away-lineup");
const eventsTable = document.querySelector("#events-table");
const scoreline = document.querySelector("#scoreline");
const stats = document.querySelector("#stats");
const resetBtn = document.querySelector("#reset-btn");
const lineupItemTemplate = document.querySelector("#lineup-item-template");

matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(matchForm);
  state.match = {
    homeTeam: formData.get("homeTeam").trim() || "Casa",
    awayTeam: formData.get("awayTeam").trim() || "Ospite",
    date: formData.get("date"),
    time: formData.get("time"),
    stadium: formData.get("stadium").trim(),
    referee: formData.get("referee").trim(),
  };
  persistAndRender();
});

homeLineupForm.addEventListener("submit", (event) => addLineupPlayer(event, "home", homeLineupForm));
awayLineupForm.addEventListener("submit", (event) => addLineupPlayer(event, "away", awayLineupForm));

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  state.events.push({
    id: crypto.randomUUID(),
    minute: Number(formData.get("minute")),
    team: formData.get("team"),
    type: formData.get("type"),
    player: formData.get("player").trim(),
    notes: formData.get("notes").trim(),
  });

  state.events.sort((a, b) => a.minute - b.minute);
  eventForm.reset();
  persistAndRender();
});

resetBtn.addEventListener("click", () => {
  if (!window.confirm("Vuoi davvero cancellare tutti i dati della gara?")) {
    return;
  }

  state = structuredClone(defaultState);
  persistAndRender();
});

function addLineupPlayer(event, team, form) {
  event.preventDefault();
  const formData = new FormData(form);
  const player = formData.get("player").trim();
  const number = Number(formData.get("number"));

  if (!player || Number.isNaN(number)) {
    return;
  }

  state.lineups[team].push({
    id: crypto.randomUUID(),
    player,
    number,
  });

  state.lineups[team].sort((a, b) => a.number - b.number);
  form.reset();
  persistAndRender();
}

function removeLineupPlayer(team, id) {
  state.lineups[team] = state.lineups[team].filter((player) => player.id !== id);
  persistAndRender();
}

function removeEvent(id) {
  state.events = state.events.filter((event) => event.id !== id);
  persistAndRender();
}

function computeStats() {
  const statsByTeam = {
    home: { goals: 0, yellow: 0, red: 0 },
    away: { goals: 0, yellow: 0, red: 0 },
  };

  for (const event of state.events) {
    if (event.type === "goal") statsByTeam[event.team].goals += 1;
    if (event.type === "yellow") statsByTeam[event.team].yellow += 1;
    if (event.type === "red") statsByTeam[event.team].red += 1;
  }

  return statsByTeam;
}

function render() {
  fillMatchForm();
  renderLineup("home", homeLineupList);
  renderLineup("away", awayLineupList);
  renderEvents();
  renderScoreAndStats();
}

function fillMatchForm() {
  matchForm.homeTeam.value = state.match.homeTeam;
  matchForm.awayTeam.value = state.match.awayTeam;
  matchForm.date.value = state.match.date;
  matchForm.time.value = state.match.time;
  matchForm.stadium.value = state.match.stadium;
  matchForm.referee.value = state.match.referee;

  eventForm.team.options[0].textContent = state.match.homeTeam;
  eventForm.team.options[1].textContent = state.match.awayTeam;
}

function renderLineup(team, listEl) {
  listEl.innerHTML = "";
  for (const player of state.lineups[team]) {
    const clone = lineupItemTemplate.content.firstElementChild.cloneNode(true);
    clone.querySelector(".player-info").textContent = `#${player.number} ${player.player}`;
    clone.querySelector("button").addEventListener("click", () => removeLineupPlayer(team, player.id));
    listEl.append(clone);
  }
}

function renderEvents() {
  eventsTable.innerHTML = "";
  for (const event of state.events) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${event.minute}'</td>
      <td>${event.team === "home" ? state.match.homeTeam : state.match.awayTeam}</td>
      <td>${eventLabels[event.type]}</td>
      <td>${event.player}</td>
      <td>${event.notes || "-"}</td>
      <td><button class="small danger" data-id="${event.id}">Elimina</button></td>
    `;
    row.querySelector("button").addEventListener("click", () => removeEvent(event.id));
    eventsTable.append(row);
  }
}

function renderScoreAndStats() {
  const computed = computeStats();
  scoreline.textContent = `${state.match.homeTeam} ${computed.home.goals} - ${computed.away.goals} ${state.match.awayTeam}`;

  stats.innerHTML = `
    <div><strong>${state.match.homeTeam}</strong><br/>🟨 ${computed.home.yellow} · 🟥 ${computed.home.red}</div>
    <div><strong>${state.match.awayTeam}</strong><br/>🟨 ${computed.away.yellow} · 🟥 ${computed.away.red}</div>
    <div><strong>Totale eventi</strong><br/>${state.events.length}</div>
    <div><strong>Luogo / Arbitro</strong><br/>${state.match.stadium || "-"} / ${state.match.referee || "-"}</div>
  `;
}

function persistAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(defaultState);
    }
    return { ...structuredClone(defaultState), ...JSON.parse(raw) };
  } catch {
    return structuredClone(defaultState);
  }
}

render();
