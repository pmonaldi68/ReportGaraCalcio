const STORAGE_KEY = "report-gara-calcio-v1";

const defaultState = {
  match: {
    homeTeam: "Casa",
    awayTeam: "Ospite",
    date: "",
    time: "",
    stadium: "",
    referee: "",
    homePossession: 50,
  },
  lineups: {
    home: [],
    away: [],
  },
  clock: {
    elapsedSeconds: 0,
    running: false,
    lastTick: null,
  },
  events: [],
};

const eventLabels = {
  goal: "Gol",
  shotOnTarget: "Tiro in porta",
  foul: "Fallo",
  yellow: "Ammonizione",
  red: "Espulsione",
  substitution: "Sostituzione",
  penaltyMissed: "Rigore sbagliato",
};

let state = loadState();
let clockInterval = null;

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
const minuteInput = eventForm.querySelector('input[name="minute"]');
const autoMinuteInput = eventForm.querySelector('input[name="autoMinute"]');
const clockDisplay = document.querySelector("#clock-display");
const clockMinute = document.querySelector("#clock-minute");
const clockStartBtn = document.querySelector("#clock-start");
const clockPauseBtn = document.querySelector("#clock-pause");
const clockResetBtn = document.querySelector("#clock-reset");
const liveHomeTeam = document.querySelector("#live-home-team");
const liveAwayTeam = document.querySelector("#live-away-team");
const liveHomeGoals = document.querySelector("#live-home-goals");
const liveAwayGoals = document.querySelector("#live-away-goals");
const possessionHomeLabel = document.querySelector("#possession-home-label");
const possessionAwayLabel = document.querySelector("#possession-away-label");
const possessionHomeValue = document.querySelector("#possession-home-value");
const possessionAwayValue = document.querySelector("#possession-away-value");
const possessionHomeBar = document.querySelector("#possession-home-bar");
const possessionAwayBar = document.querySelector("#possession-away-bar");
const shotsHomeLabel = document.querySelector("#shots-home-label");
const shotsAwayLabel = document.querySelector("#shots-away-label");
const shotsHomeValue = document.querySelector("#shots-home-value");
const shotsAwayValue = document.querySelector("#shots-away-value");
const foulsHomeLabel = document.querySelector("#fouls-home-label");
const foulsAwayLabel = document.querySelector("#fouls-away-label");
const foulsHomeValue = document.querySelector("#fouls-home-value");
const foulsAwayValue = document.querySelector("#fouls-away-value");
const cardsHomeLabel = document.querySelector("#cards-home-label");
const cardsAwayLabel = document.querySelector("#cards-away-label");
const cardsHomeTotal = document.querySelector("#cards-home-total");
const cardsAwayTotal = document.querySelector("#cards-away-total");
const cardsHomeYellow = document.querySelector("#cards-home-yellow");
const cardsHomeRed = document.querySelector("#cards-home-red");
const cardsAwayYellow = document.querySelector("#cards-away-yellow");
const cardsAwayRed = document.querySelector("#cards-away-red");

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
    homePossession: normalizePossession(formData.get("homePossession")),
  };
  persistAndRender();
});

homeLineupForm.addEventListener("submit", (event) => addLineupPlayer(event, "home", homeLineupForm));
awayLineupForm.addEventListener("submit", (event) => addLineupPlayer(event, "away", awayLineupForm));

autoMinuteInput.addEventListener("change", () => {
  minuteInput.readOnly = autoMinuteInput.checked;
  if (autoMinuteInput.checked) {
    setEventMinuteFromClock();
  }
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const minute = autoMinuteInput.checked ? getClockMinute() : Number(formData.get("minute"));
  if (!Number.isFinite(minute)) {
    return;
  }

  state.events.push({
    id: crypto.randomUUID(),
    minute,
    team: formData.get("team"),
    type: formData.get("type"),
    player: formData.get("player").trim(),
    notes: formData.get("notes").trim(),
  });

  state.events.sort((a, b) => a.minute - b.minute);
  eventForm.reset();
  autoMinuteInput.checked = true;
  minuteInput.readOnly = true;
  setEventMinuteFromClock();
  persistAndRender();
});

clockStartBtn.addEventListener("click", startClock);
clockPauseBtn.addEventListener("click", pauseClock);
clockResetBtn.addEventListener("click", resetClock);

resetBtn.addEventListener("click", () => {
  if (!window.confirm("Vuoi davvero cancellare tutti i dati della gara?")) {
    return;
  }

  state = structuredClone(defaultState);
  stopClockInterval();
  persistAndRender();
  syncClockIntervalWithState();
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

function getClockMinute() {
  return Math.floor(state.clock.elapsedSeconds / 60);
}

function setEventMinuteFromClock() {
  minuteInput.value = String(getClockMinute());
}

function startClock() {
  if (state.clock.running) {
    return;
  }
  state.clock.running = true;
  state.clock.lastTick = Date.now();
  syncClockIntervalWithState();
  persistAndRender();
}

function pauseClock() {
  if (!state.clock.running) {
    return;
  }
  applyElapsedFromLastTick();
  state.clock.running = false;
  state.clock.lastTick = null;
  stopClockInterval();
  persistAndRender();
}

function resetClock() {
  state.clock.elapsedSeconds = 0;
  state.clock.lastTick = state.clock.running ? Date.now() : null;
  setEventMinuteFromClock();
  persistAndRender();
}

function applyElapsedFromLastTick() {
  if (!state.clock.running || state.clock.lastTick === null) {
    return;
  }
  const now = Date.now();
  const deltaSeconds = Math.floor((now - state.clock.lastTick) / 1000);
  if (deltaSeconds > 0) {
    state.clock.elapsedSeconds += deltaSeconds;
    state.clock.lastTick += deltaSeconds * 1000;
  }
}

function syncClockIntervalWithState() {
  stopClockInterval();
  if (state.clock.running) {
    clockInterval = setInterval(() => {
      applyElapsedFromLastTick();
      renderClock();
      if (autoMinuteInput.checked) {
        setEventMinuteFromClock();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 250);
  }
}

function stopClockInterval() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

function computeStats() {
  const statsByTeam = {
    home: { goals: 0, yellow: 0, red: 0, shotOnTarget: 0, foul: 0 },
    away: { goals: 0, yellow: 0, red: 0, shotOnTarget: 0, foul: 0 },
  };

  for (const event of state.events) {
    if (event.type === "goal") statsByTeam[event.team].goals += 1;
    if (event.type === "yellow") statsByTeam[event.team].yellow += 1;
    if (event.type === "red") statsByTeam[event.team].red += 1;
    if (event.type === "shotOnTarget") statsByTeam[event.team].shotOnTarget += 1;
    if (event.type === "foul") statsByTeam[event.team].foul += 1;
  }

  return statsByTeam;
}

function render() {
  fillMatchForm();
  renderLineup("home", homeLineupList);
  renderLineup("away", awayLineupList);
  renderEvents();
  renderScoreAndStats();
  renderMatchStats();
  renderClock();
}

function renderClock() {
  const minutes = Math.floor(state.clock.elapsedSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (state.clock.elapsedSeconds % 60).toString().padStart(2, "0");
  clockDisplay.textContent = `${minutes}:${seconds}`;
  clockMinute.textContent = `${getClockMinute()}'`;
  clockStartBtn.disabled = state.clock.running;
  clockPauseBtn.disabled = !state.clock.running;
}

function fillMatchForm() {
  matchForm.homeTeam.value = state.match.homeTeam;
  matchForm.awayTeam.value = state.match.awayTeam;
  matchForm.date.value = state.match.date;
  matchForm.time.value = state.match.time;
  matchForm.stadium.value = state.match.stadium;
  matchForm.referee.value = state.match.referee;
  matchForm.homePossession.value = state.match.homePossession;

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
  liveHomeTeam.textContent = state.match.homeTeam;
  liveAwayTeam.textContent = state.match.awayTeam;
  liveHomeGoals.textContent = String(computed.home.goals);
  liveAwayGoals.textContent = String(computed.away.goals);

  stats.innerHTML = `
    <div><strong>${state.match.homeTeam}</strong><br/>🟨 ${computed.home.yellow} · 🟥 ${computed.home.red}</div>
    <div><strong>${state.match.awayTeam}</strong><br/>🟨 ${computed.away.yellow} · 🟥 ${computed.away.red}</div>
    <div><strong>Totale eventi</strong><br/>${state.events.length}</div>
    <div><strong>Luogo / Arbitro</strong><br/>${state.match.stadium || "-"} / ${state.match.referee || "-"}</div>
  `;
}


function renderMatchStats() {
  const computed = computeStats();
  const homePossession = normalizePossession(state.match.homePossession);
  const awayPossession = 100 - homePossession;

  possessionHomeLabel.textContent = state.match.homeTeam;
  possessionAwayLabel.textContent = state.match.awayTeam;
  possessionHomeValue.textContent = `${homePossession}%`;
  possessionAwayValue.textContent = `${awayPossession}%`;
  possessionHomeBar.style.width = `${homePossession}%`;
  possessionAwayBar.style.width = `${awayPossession}%`;

  shotsHomeLabel.textContent = state.match.homeTeam;
  shotsAwayLabel.textContent = state.match.awayTeam;
  shotsHomeValue.textContent = String(computed.home.shotOnTarget);
  shotsAwayValue.textContent = String(computed.away.shotOnTarget);

  foulsHomeLabel.textContent = state.match.homeTeam;
  foulsAwayLabel.textContent = state.match.awayTeam;
  foulsHomeValue.textContent = String(computed.home.foul);
  foulsAwayValue.textContent = String(computed.away.foul);

  cardsHomeLabel.textContent = state.match.homeTeam;
  cardsAwayLabel.textContent = state.match.awayTeam;
  cardsHomeTotal.textContent = String(computed.home.yellow + computed.home.red);
  cardsAwayTotal.textContent = String(computed.away.yellow + computed.away.red);
  cardsHomeYellow.textContent = computed.home.yellow;
  cardsHomeRed.textContent = computed.home.red;
  cardsAwayYellow.textContent = computed.away.yellow;
  cardsAwayRed.textContent = computed.away.red;
}

function normalizePossession(value) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return 50;
  }
  return Math.min(100, Math.max(0, Math.round(num)));
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
    const parsed = JSON.parse(raw);
    const merged = {
      ...structuredClone(defaultState),
      ...parsed,
      match: { ...defaultState.match, ...(parsed.match || {}) },
      lineups: {
        home: parsed.lineups?.home || [],
        away: parsed.lineups?.away || [],
      },
      clock: { ...defaultState.clock, ...(parsed.clock || {}) },
    };

    if (merged.clock.running && merged.clock.lastTick === null) {
      merged.clock.lastTick = Date.now();
    }

    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

minuteInput.readOnly = autoMinuteInput.checked;
setEventMinuteFromClock();
syncClockIntervalWithState();
render();
