const STORAGE_KEY = "report-gara-calcio-v1";
const ARCHIVE_KEY = "report-gara-calcio-archive-v1";
const MAX_LINEUP_NUMBER = 20;
const defaultState = {
  match: {
    homeTeam: "",
    awayTeam: "",
    date: "",
    time: "",
    stadium: "",
    referee: "",
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
  yellow: "Ammonizione",
  red: "Espulsione",
  substitution: "Sostituzione",
  penaltyMissed: "Rigore sbagliato",
};

let state = loadState();
let archiveState = loadArchive();
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
const homeNumberInput = homeLineupForm.querySelector('input[name="number"]');
const awayNumberInput = awayLineupForm.querySelector('input[name="number"]');
const awayPlayerInput = document.querySelector("#away-player-input");
const awayPlayerSelect = document.querySelector("#away-player-select");
const eventTypeSelect = eventForm.querySelector('select[name="type"]');
const eventPlayerLabel = document.querySelector("#event-player-label");
const eventPlayerLabelText = document.querySelector("#event-player-label-text");
const subInLabel = document.querySelector("#sub-in-label");
const subInInput = eventForm.querySelector('select[name="subInNumber"]');
const archiveSaveBtn = document.querySelector("#archive-save-btn");
const exportPdfBtn = document.querySelector("#export-pdf-btn");
const archiveList = document.querySelector("#archive-list");

matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(matchForm);
  state.match = {
    homeTeam: formData.get("homeTeam").trim(),
    awayTeam: formData.get("awayTeam").trim(),
    date: formData.get("date"),
    time: formData.get("time"),
    stadium: formData.get("stadium").trim(),
    referee: formData.get("referee").trim(),
  };
  persistAndRender();
  syncAwayPlayerMode();
});

homeLineupForm.addEventListener("submit", (event) => addLineupPlayer(event, "home", homeLineupForm));
awayLineupForm.addEventListener("submit", (event) => addLineupPlayer(event, "away", awayLineupForm));

autoMinuteInput.addEventListener("change", () => {
  minuteInput.readOnly = autoMinuteInput.checked;
  if (autoMinuteInput.checked) {
    setEventMinuteFromClock();
  }
});

eventTypeSelect.addEventListener("change", updateSubstitutionFields);

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const minute = autoMinuteInput.checked ? getClockMinute() : Number(formData.get("minute"));
  if (!Number.isFinite(minute)) {
    return;
  }

  const type = formData.get("type");
  const baseNotes = formData.get("notes").trim();
  let playerNumber = Number(formData.get("playerNumber"));
  let notes = baseNotes;

  if (!Number.isFinite(playerNumber) || playerNumber < 1 || playerNumber > MAX_LINEUP_NUMBER) {
    return;
  }

  if (type === "substitution") {
    const subInNumber = Number(formData.get("subInNumber"));
    if (!Number.isFinite(playerNumber) || !Number.isFinite(subInNumber) || subInNumber < 1 || subInNumber > MAX_LINEUP_NUMBER) {
      return;
    }
    notes = `Entra n° ${subInNumber}${baseNotes ? ` · ${baseNotes}` : ""}`;
  }

  state.events.push({
    id: crypto.randomUUID(),
    minute,
    team: formData.get("team"),
    type,
    playerNumber,
    notes,
  });

  state.events.sort((a, b) => a.minute - b.minute);
  eventForm.reset();
  autoMinuteInput.checked = true;
  minuteInput.readOnly = true;
  setEventMinuteFromClock();
  updateSubstitutionFields();
  persistAndRender();
});

clockStartBtn.addEventListener("click", startClock);
clockPauseBtn.addEventListener("click", pauseClock);
clockResetBtn.addEventListener("click", resetClock);
archiveSaveBtn.addEventListener("click", saveCurrentMatchToArchive);
exportPdfBtn.addEventListener("click", exportOrSharePdf);

resetBtn.addEventListener("click", () => {
  if (!window.confirm("Vuoi davvero cancellare tutti i dati della gara?")) {
    return;
  }

  state = structuredClone(defaultState);
  applyCurrentDateTimeDefaults(state);
  stopClockInterval();
  persistAndRender();
  syncClockIntervalWithState();
  syncLineupNumberInputs();
  syncAwayPlayerMode();
});

function addLineupPlayer(event, team, form) {
  event.preventDefault();
  const formData = new FormData(form);
  const player = getSelectedLineupPlayer(team, formData);
  const number = Number(formData.get("number"));

  if (!player || Number.isNaN(number) || number < 1 || number > MAX_LINEUP_NUMBER) {
    return;
  }

  const hasPlayer = state.lineups[team].some((lineupPlayer) => lineupPlayer.player === player);
  const hasNumber = state.lineups[team].some((lineupPlayer) => lineupPlayer.number === number);

  if (hasPlayer || hasNumber) {
    window.alert("Giocatore o numero già presente in questa formazione.");
    return;
  }

  state.lineups[team].push({
    id: crypto.randomUUID(),
    player,
    number,
  });

  state.lineups[team].sort((a, b) => a.number - b.number);
  resetLineupPlayerField(team);
  persistAndRender();
  setNextLineupNumber(team);
  focusLineupPlayerField(team);
}

function removeLineupPlayer(team, id) {
  state.lineups[team] = state.lineups[team].filter((player) => player.id !== id);
  persistAndRender();
  setNextLineupNumber(team);
  focusLineupPlayerField(team);
}

function removeEvent(id) {
  state.events = state.events.filter((event) => event.id !== id);
  persistAndRender();
}

function updateSubstitutionFields() {
  const isSubstitution = eventTypeSelect.value === "substitution";

  eventPlayerLabelText.textContent = isSubstitution ? "N° calciatore esce" : "N° calciatore";
  eventForm.playerNumber.required = true;

  subInLabel.hidden = !isSubstitution;
  subInInput.required = isSubstitution;

  if (!isSubstitution) {
    subInInput.value = "";
  }
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
    return false;
  }
  const now = Date.now();
  const deltaSeconds = Math.floor((now - state.clock.lastTick) / 1000);
  if (deltaSeconds > 0) {
    state.clock.elapsedSeconds += deltaSeconds;
    state.clock.lastTick += deltaSeconds * 1000;
    return true;
  }
  return false;
}

function syncClockIntervalWithState() {
  stopClockInterval();
  if (state.clock.running) {
    clockInterval = setInterval(() => {
      const changed = applyElapsedFromLastTick();
      if (!changed) {
        return;
      }
      renderClock();
      if (autoMinuteInput.checked) {
        setEventMinuteFromClock();
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }, 500);
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

  eventForm.team.options[0].textContent = getTeamName("home");
  eventForm.team.options[1].textContent = getTeamName("away");
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
      <td>${event.team === "home" ? getTeamName("home") : getTeamName("away")}</td>
      <td>${eventLabels[event.type]}</td>
      <td>${event.playerNumber ?? event.player ?? "-"}</td>
      <td>${event.notes || "-"}</td>
      <td><button class="small danger" data-id="${event.id}">Elimina</button></td>
    `;
    row.querySelector("button").addEventListener("click", () => removeEvent(event.id));
    eventsTable.append(row);
  }
}

function getTeamName(side) {
  const name = side === "home" ? state.match.homeTeam : state.match.awayTeam;
  if (name && name.trim()) return name;
  return side === "home" ? "Casa" : "Ospite";
}

function renderScoreAndStats() {
  const computed = computeStats();
  const homeTeamName = getTeamName("home");
  const awayTeamName = getTeamName("away");
  scoreline.textContent = `${homeTeamName} ${computed.home.goals} - ${computed.away.goals} ${awayTeamName}`;
  liveHomeTeam.textContent = homeTeamName;
  liveAwayTeam.textContent = awayTeamName;
  liveHomeGoals.textContent = String(computed.home.goals);
  liveAwayGoals.textContent = String(computed.away.goals);

  stats.innerHTML = `
    <div><strong>${homeTeamName}</strong><br/>🟨 ${computed.home.yellow} · 🟥 ${computed.home.red}</div>
    <div><strong>${awayTeamName}</strong><br/>🟨 ${computed.away.yellow} · 🟥 ${computed.away.red}</div>
    <div><strong>Totale eventi</strong><br/>${state.events.length}</div>
    <div><strong>Luogo / Arbitro</strong><br/>${state.match.stadium || "-"} / ${state.match.referee || "-"}</div>
  `;
}

function getCurrentDateTime() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return { date, time };
}

function applyCurrentDateTimeDefaults(targetState) {
  const current = getCurrentDateTime();
  if (!targetState.match.date) targetState.match.date = current.date;
  if (!targetState.match.time) targetState.match.time = current.time;
}

function isCynthiaAwaySelected() {
  return state.match.awayTeam === "A.S.D. CYNTHIA 1920";
}

function syncAwayPlayerMode() {
  const useSelect = isCynthiaAwaySelected();
  awayPlayerInput.hidden = useSelect;
  awayPlayerInput.disabled = useSelect;
  awayPlayerInput.required = !useSelect;

  awayPlayerSelect.hidden = !useSelect;
  awayPlayerSelect.disabled = !useSelect;
  awayPlayerSelect.required = useSelect;
}

function getSelectedLineupPlayer(team, formData) {
  if (team === "away" && isCynthiaAwaySelected()) {
    return String(formData.get("playerSelect") || "").trim();
  }
  return String(formData.get("player") || "").trim();
}

function resetLineupPlayerField(team) {
  if (team === "away" && isCynthiaAwaySelected()) {
    awayPlayerSelect.selectedIndex = 0;
    return;
  }

  if (team === "away") {
    awayPlayerInput.value = "";
    return;
  }

  homeLineupForm.player.value = "";
}

function focusLineupPlayerField(team) {
  if (team === "away" && isCynthiaAwaySelected()) {
    awayPlayerSelect.focus();
    return;
  }

  if (team === "away") {
    awayPlayerInput.focus();
    return;
  }

  homeLineupForm.player.focus();
}

function getNextLineupNumber(team) {
  const used = new Set(state.lineups[team].map((player) => player.number));
  for (let number = 1; number <= MAX_LINEUP_NUMBER; number += 1) {
    if (!used.has(number)) {
      return number;
    }
  }
  return MAX_LINEUP_NUMBER;
}

function setNextLineupNumber(team) {
  const next = getNextLineupNumber(team);
  const targetInput = team === "home" ? homeNumberInput : awayNumberInput;
  targetInput.value = String(next);
}

function syncLineupNumberInputs() {
  setNextLineupNumber("home");
  setNextLineupNumber("away");
}


function persistArchive() {
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archiveState));
}

function loadArchive() {
  try {
    const raw = localStorage.getItem(ARCHIVE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCurrentMatchToArchive() {
  const id = crypto.randomUUID();
  archiveState.unshift({
    id,
    createdAt: new Date().toISOString(),
    state: structuredClone(state),
  });
  persistArchive();
  renderArchiveList();
}

function loadArchivedMatch(id) {
  const found = archiveState.find((item) => item.id === id);
  if (!found) return;
  stopClockInterval();
  state = structuredClone(found.state);
  state.clock.running = false;
  state.clock.lastTick = null;
  persistAndRender();
  syncClockIntervalWithState();
  syncLineupNumberInputs();
  syncAwayPlayerMode();
  updateSubstitutionFields();
}

function deleteArchivedMatch(id) {
  archiveState = archiveState.filter((item) => item.id !== id);
  persistArchive();
  renderArchiveList();
}

function renderArchiveList() {
  archiveList.innerHTML = "";
  if (!archiveState.length) {
    const empty = document.createElement("li");
    empty.textContent = "Nessuna gara archiviata";
    archiveList.append(empty);
    return;
  }

  for (const item of archiveState) {
    const li = document.createElement("li");
    const home = item.state?.match?.homeTeam || "Casa";
    const away = item.state?.match?.awayTeam || "Ospite";
    const when = new Date(item.createdAt).toLocaleString("it-IT");
    li.innerHTML = `<span>${home} vs ${away} · ${when}</span>`;

    const actions = document.createElement("div");
    const loadBtn = document.createElement("button");
    loadBtn.className = "small";
    loadBtn.type = "button";
    loadBtn.textContent = "Carica";
    loadBtn.addEventListener("click", () => loadArchivedMatch(item.id));

    const delBtn = document.createElement("button");
    delBtn.className = "small danger";
    delBtn.type = "button";
    delBtn.textContent = "Elimina";
    delBtn.addEventListener("click", () => deleteArchivedMatch(item.id));

    actions.append(loadBtn, delBtn);
    li.append(actions);
    archiveList.append(li);
  }
}

function exportOrSharePdf() {
  window.print();
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

applyCurrentDateTimeDefaults(state);
minuteInput.readOnly = autoMinuteInput.checked;
setEventMinuteFromClock();
syncClockIntervalWithState();
syncLineupNumberInputs();
syncAwayPlayerMode();
updateSubstitutionFields();
renderArchiveList();
render();
