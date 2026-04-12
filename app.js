const STORAGE_KEY = "report-gara-calcio-v1";
const ARCHIVE_KEY = "report-gara-calcio-archive-v1";
const MAX_LINEUP_NUMBER = 99;
const CLOCK_PHASES = {
  firstHalf: "firstHalf",
  firstHalfStoppage: "firstHalfStoppage",
  secondHalf: "secondHalf",
  secondHalfStoppage: "secondHalfStoppage",
  finished: "finished",
};

const REGULAR_HALF_SECONDS = 45 * 60;

const TEAM_NAME_ALIASES = {
  "A.C.D. ANITRELLA": "ANITRELLA",
  "A.S.D. ALATRI": "ALATRI",
  "A.S.D. ATLETICO LARIANO": "ATLETICO LARIANO",
  "A.S.D. ATLETICO TORRENOVA 1986": "ATLETICO TORRENOVA 1986",
  "A.S.D. BELMONTE CASTELLO": "BELMONTE CASTELLO",
  "A.S.D. BOVILLE ERNICA CALCIO": "BOVILLE ERNICA CALCIO",
  "A.S.D. CITTA DI CEPRANO CALCIO": "CITTA DI CEPRANO CALCIO",
  "A.S.D. CITTA MONTE S.G. CAMPANO": "CITTA MONTE S.G. CAMPANO",
  "A.S.D. CYNTHIA 1920": "CYNTHIA 1920",
  "A.S.D. FOLGORE AMASENO": "FOLGORE AMASENO",
  "A.S.D. MAGNITUDO FCCG": "MAGNITUDO FCCG",
  "A.S.D. REAL SAN BASILIO 1960": "REAL SAN BASILIO 1960",
  "A.S.D. ROCCA PRIORA RDP CALCIO": "ROCCA PRIORA RDP CALCIO",
  "A.S.D. VIVACE GROTTAFERRATA 1922": "VIVACE GROTTAFERRATA 1922",
  "ASD P. VIGOR PERCONTI": "VIGOR PERCONTI",
  "ATLETICO MORENA SSDARL": "ATLETICO MORENA",
  "S.S.D. POLISPORTIVA DE ROSSI ARL": "POLISPORTIVA DE ROSSI",
  "U.S.D. POL.CANARINI 1926 RDP": "CANARINI 1926 RDP",
};

const defaultState = {
  match: {
    homeTeam: "",
    awayTeam: "",
    date: "",
    time: "",
    stadium: "",
  },
  lineups: {
    home: [],
    away: [],
  },
  captains: {
    home: { captain: "", viceCaptain: "" },
    away: { captain: "", viceCaptain: "" },
  },
  clock: {
    elapsedSeconds: 0,
    running: false,
    lastTick: null,
    phase: CLOCK_PHASES.firstHalf,
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
const homeLineupTitle = document.querySelector("#home-lineup-title");
const awayLineupTitle = document.querySelector("#away-lineup-title");
const eventsTable = document.querySelector("#events-table");
const scoreline = document.querySelector("#scoreline");
const stats = document.querySelector("#stats");
const resetBtn = document.querySelector("#reset-btn");
const lineupItemTemplate = document.querySelector("#lineup-item-template");
const minuteInput = eventForm.querySelector('input[name="minute"]');
const autoMinuteInput = eventForm.querySelector('input[name="autoMinute"]');
const clockDisplay = document.querySelector("#clock-display");
const clockPhase = document.querySelector("#clock-phase");
const clockMinute = document.querySelector("#clock-minute");
const clockStartBtn = document.querySelector("#clock-start");
const clockPauseBtn = document.querySelector("#clock-pause");
const clockResetBtn = document.querySelector("#clock-reset");
const clockNextPhaseBtn = document.querySelector("#clock-next-phase");
const liveHomeTeam = document.querySelector("#live-home-team");
const liveAwayTeam = document.querySelector("#live-away-team");
const liveHomeGoals = document.querySelector("#live-home-goals");
const liveAwayGoals = document.querySelector("#live-away-goals");
const homeNumberInput = homeLineupForm.querySelector('[name="number"]');
const awayNumberInput = awayLineupForm.querySelector('[name="number"]');
const awayPlayerInput = document.querySelector("#away-player-input");
const awayPlayerSelect = document.querySelector("#away-player-select");
const eventTypeSelect = eventForm.querySelector('select[name="type"]');
const eventPlayerLabel = document.querySelector("#event-player-label");
const eventPlayerLabelText = document.querySelector("#event-player-label-text");
const subInLabel = document.querySelector("#sub-in-label");
const subInInput = eventForm.querySelector('select[name="subInNumber"]');
const eventPlayerNumberInput = eventForm.querySelector('select[name="playerNumber"]');
const homeCaptainSelect = document.querySelector("#home-captain-select");
const homeViceCaptainSelect = document.querySelector("#home-vice-captain-select");
const awayCaptainSelect = document.querySelector("#away-captain-select");
const awayViceCaptainSelect = document.querySelector("#away-vice-captain-select");
const archiveSaveBtn = document.querySelector("#archive-save-btn");
const exportPdfBtn = document.querySelector("#export-pdf-btn");
const archiveList = document.querySelector("#archive-list");

matchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(matchForm);
  const homeTeam = normalizeTeamName(formData.get("homeTeam"));
  const awayTeam = normalizeTeamName(formData.get("awayTeam"));

  if (!validateTeamsAreDifferent(homeTeam, awayTeam)) {
    return;
  }

  state.match = {
    homeTeam,
    awayTeam,
    date: formData.get("date"),
    time: formData.get("time"),
    stadium: formData.get("stadium").trim(),
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
homeCaptainSelect.addEventListener("change", () => setLeader("home", "captain", homeCaptainSelect.value));
homeViceCaptainSelect.addEventListener("change", () => setLeader("home", "viceCaptain", homeViceCaptainSelect.value));
awayCaptainSelect.addEventListener("change", () => setLeader("away", "captain", awayCaptainSelect.value));
awayViceCaptainSelect.addEventListener("change", () => setLeader("away", "viceCaptain", awayViceCaptainSelect.value));
matchForm.homeTeam.addEventListener("change", clearTeamSelectionValidation);
matchForm.awayTeam.addEventListener("change", clearTeamSelectionValidation);

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
clockNextPhaseBtn.addEventListener("click", goToNextClockPhase);
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

function normalizePlayerName(playerName) {
  return String(playerName || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function validateTeamsAreDifferent(homeTeam, awayTeam) {
  if (homeTeam && awayTeam && homeTeam === awayTeam) {
    const message = "Squadra casa e squadra ospite devono essere diverse.";
    matchForm.homeTeam.setCustomValidity(message);
    matchForm.awayTeam.setCustomValidity(message);
    matchForm.homeTeam.reportValidity();
    return false;
  }
  clearTeamSelectionValidation();
  return true;
}

function clearTeamSelectionValidation() {
  matchForm.homeTeam.setCustomValidity("");
  matchForm.awayTeam.setCustomValidity("");
}

function addLineupPlayer(event, team, form) {
  event.preventDefault();
  const formData = new FormData(form);
  const player = normalizePlayerName(getSelectedLineupPlayer(team, formData));
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
  syncTeamLeadersWithLineup(team);
  resetLineupPlayerField(team);
  persistAndRender();
  setNextLineupNumber(team);
  focusLineupPlayerField(team);
}

function removeLineupPlayer(team, id) {
  state.lineups[team] = state.lineups[team].filter((player) => player.id !== id);
  syncTeamLeadersWithLineup(team);
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
  subInInput.disabled = !isSubstitution;

  if (!isSubstitution) {
    subInInput.value = "";
  }
}

function populateNumberSelect(selectElement, placeholderText) {
  const previousValue = selectElement.value;
  selectElement.innerHTML = "";

  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholderText;
  selectElement.append(placeholderOption);

  for (let number = 1; number <= MAX_LINEUP_NUMBER; number += 1) {
    const option = document.createElement("option");
    option.value = String(number);
    option.textContent = String(number);
    selectElement.append(option);
  }

  selectElement.value = previousValue;
}

function getLineupHeading(side) {
  const teamName = getTeamName(side);
  return `Formazione ${teamName}`;
}

function getLineupPlayerLabel(player) {
  return `#${player.number} ${player.player}`;
}

function setLeader(team, role, value) {
  const selectedValue = String(value || "");
  const otherRole = role === "captain" ? "viceCaptain" : "captain";

  if (selectedValue && state.captains[team][otherRole] === selectedValue) {
    window.alert("Capitano e vice capitano devono essere diversi.");
    const targetSelect = team === "home"
      ? (role === "captain" ? homeCaptainSelect : homeViceCaptainSelect)
      : (role === "captain" ? awayCaptainSelect : awayViceCaptainSelect);
    targetSelect.value = state.captains[team][role] || "";
    return;
  }

  state.captains[team][role] = selectedValue;
  persistAndRender();
}

function syncTeamLeadersWithLineup(team) {
  const existingNumbers = new Set(state.lineups[team].map((player) => String(player.number)));
  if (!existingNumbers.has(state.captains[team].captain)) {
    state.captains[team].captain = "";
  }
  if (!existingNumbers.has(state.captains[team].viceCaptain)) {
    state.captains[team].viceCaptain = "";
  }
}

function populateLeaderSelect(team, selectElement, roleLabel, selectedValue) {
  const currentSelected = String(selectedValue || "");
  selectElement.innerHTML = "";

  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = `Seleziona ${roleLabel}`;
  selectElement.append(empty);

  for (const player of state.lineups[team]) {
    const option = document.createElement("option");
    option.value = String(player.number);
    option.textContent = getLineupPlayerLabel(player);
    selectElement.append(option);
  }

  selectElement.value = currentSelected;
}

function renderLineupMetadata() {
  homeLineupTitle.textContent = getLineupHeading("home");
  awayLineupTitle.textContent = getLineupHeading("away");

  syncTeamLeadersWithLineup("home");
  syncTeamLeadersWithLineup("away");

  populateLeaderSelect("home", homeCaptainSelect, "capitano", state.captains.home.captain);
  populateLeaderSelect("home", homeViceCaptainSelect, "vice capitano", state.captains.home.viceCaptain);
  populateLeaderSelect("away", awayCaptainSelect, "capitano", state.captains.away.captain);
  populateLeaderSelect("away", awayViceCaptainSelect, "vice capitano", state.captains.away.viceCaptain);
}

function getPhaseElapsedSeconds() {
  return state.clock.elapsedSeconds % REGULAR_HALF_SECONDS;
}

function getClockMinute() {
  const fullMinutes = Math.floor(state.clock.elapsedSeconds / 60);
  if (fullMinutes < 45) return fullMinutes;
  if (state.clock.phase === CLOCK_PHASES.firstHalfStoppage) return 45;
  if (fullMinutes < 90) return fullMinutes;
  return 90;
}

function setEventMinuteFromClock() {
  minuteInput.value = String(getClockMinute());
}

function getClockPhaseLabel() {
  if (state.clock.phase === CLOCK_PHASES.firstHalf) {
    return "1° tempo";
  }
  if (state.clock.phase === CLOCK_PHASES.firstHalfStoppage) {
    const stoppageMinutes = Math.floor(getPhaseElapsedSeconds() / 60);
    return `Recupero 1° tempo +${stoppageMinutes}'`;
  }
  if (state.clock.phase === CLOCK_PHASES.secondHalf) {
    return "2° tempo";
  }
  if (state.clock.phase === CLOCK_PHASES.secondHalfStoppage) {
    const stoppageMinutes = Math.floor(getPhaseElapsedSeconds() / 60);
    return `Recupero 2° tempo +${stoppageMinutes}'`;
  }
  return "Gara terminata";
}

function handleRegularTimeBoundary() {
  if (state.clock.phase === CLOCK_PHASES.firstHalf && state.clock.elapsedSeconds >= REGULAR_HALF_SECONDS) {
    state.clock.running = false;
    state.clock.lastTick = null;
    state.clock.phase = CLOCK_PHASES.firstHalfStoppage;
    stopClockInterval();
    return true;
  }

  if (state.clock.phase === CLOCK_PHASES.secondHalf && state.clock.elapsedSeconds >= 2 * REGULAR_HALF_SECONDS) {
    state.clock.running = false;
    state.clock.lastTick = null;
    state.clock.phase = CLOCK_PHASES.secondHalfStoppage;
    stopClockInterval();
    return true;
  }

  return false;
}

function startClock() {
  if (state.clock.running || state.clock.phase === CLOCK_PHASES.finished) {
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
  state.clock.phase = CLOCK_PHASES.firstHalf;
  state.clock.running = false;
  state.clock.lastTick = null;
  stopClockInterval();
  setEventMinuteFromClock();
  persistAndRender();
}

function goToNextClockPhase() {
  if (state.clock.running) {
    return;
  }

  if (state.clock.phase === CLOCK_PHASES.firstHalfStoppage) {
    state.clock.phase = CLOCK_PHASES.secondHalf;
    state.clock.elapsedSeconds = REGULAR_HALF_SECONDS;
  } else if (state.clock.phase === CLOCK_PHASES.secondHalfStoppage) {
    state.clock.phase = CLOCK_PHASES.finished;
    state.clock.elapsedSeconds = 2 * REGULAR_HALF_SECONDS;
  } else {
    return;
  }

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

    handleRegularTimeBoundary();
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
  renderLineupMetadata();
  renderLineup("home", homeLineupList);
  renderLineup("away", awayLineupList);
  renderEvents();
  renderScoreAndStats();
  renderClock();
}

function renderClock() {
  const phaseSeconds = getPhaseElapsedSeconds();
  const minutes = Math.floor(phaseSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (phaseSeconds % 60).toString().padStart(2, "0");
  clockDisplay.textContent = `${minutes}:${seconds}`;
  clockPhase.textContent = getClockPhaseLabel();
  clockMinute.textContent = `${getClockMinute()}'`;

  const canStart = !state.clock.running
    && state.clock.phase !== CLOCK_PHASES.firstHalfStoppage
    && state.clock.phase !== CLOCK_PHASES.secondHalfStoppage
    && state.clock.phase !== CLOCK_PHASES.finished;

  clockStartBtn.disabled = !canStart;
  clockPauseBtn.disabled = !state.clock.running;
  clockNextPhaseBtn.disabled = state.clock.running
    || (state.clock.phase !== CLOCK_PHASES.firstHalfStoppage && state.clock.phase !== CLOCK_PHASES.secondHalfStoppage);

  if (state.clock.phase === CLOCK_PHASES.firstHalfStoppage) {
    clockNextPhaseBtn.textContent = "Inizia 2° tempo";
  } else if (state.clock.phase === CLOCK_PHASES.secondHalfStoppage) {
    clockNextPhaseBtn.textContent = "Termina gara";
  } else {
    clockNextPhaseBtn.textContent = "Inizia 2° tempo";
  }
}

function fillMatchForm() {
  matchForm.homeTeam.value = state.match.homeTeam;
  matchForm.awayTeam.value = state.match.awayTeam;
  matchForm.date.value = state.match.date;
  matchForm.time.value = state.match.time;
  matchForm.stadium.value = state.match.stadium;

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
    const minuteCell = document.createElement("td");
    minuteCell.textContent = `${event.minute}'`;
    const teamCell = document.createElement("td");
    teamCell.textContent = event.team === "home" ? getTeamName("home") : getTeamName("away");
    const typeCell = document.createElement("td");
    typeCell.textContent = eventLabels[event.type];
    const playerCell = document.createElement("td");
    playerCell.textContent = String(event.playerNumber ?? event.player ?? "-");
    const notesCell = document.createElement("td");
    notesCell.textContent = event.notes || "-";
    const actionsCell = document.createElement("td");
    const removeButton = document.createElement("button");
    removeButton.className = "small danger";
    removeButton.type = "button";
    removeButton.textContent = "Elimina";
    removeButton.addEventListener("click", () => removeEvent(event.id));
    actionsCell.append(removeButton);

    row.append(minuteCell, teamCell, typeCell, playerCell, notesCell, actionsCell);
    eventsTable.append(row);
  }
}

function getTeamName(side) {
  const name = side === "home" ? state.match.homeTeam : state.match.awayTeam;
  if (name && name.trim()) return name;
  return side === "home" ? "Casa" : "Ospite";
}

function normalizeTeamName(teamName) {
  const raw = String(teamName || "").trim();
  if (!raw) return "";
  return TEAM_NAME_ALIASES[raw] || raw;
}

function normalizeStateTeamNames(targetState) {
  targetState.match.homeTeam = normalizeTeamName(targetState.match.homeTeam);
  targetState.match.awayTeam = normalizeTeamName(targetState.match.awayTeam);
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

  stats.innerHTML = "";
  stats.append(
    createStatCard(homeTeamName, `🟨 ${computed.home.yellow} · 🟥 ${computed.home.red}`),
    createStatCard(awayTeamName, `🟨 ${computed.away.yellow} · 🟥 ${computed.away.red}`),
    createStatCard("Totale eventi", String(state.events.length)),
    createStatCard("Campo", state.match.stadium || "-"),
  );
}

function createStatCard(title, value) {
  const card = document.createElement("div");
  const strong = document.createElement("strong");
  strong.textContent = title;
  const lineBreak = document.createElement("br");
  card.append(strong, lineBreak, document.createTextNode(value));
  return card;
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
  return state.match.awayTeam === "CYNTHIA 1920";
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
  return null;
}

function setNextLineupNumber(team) {
  const next = getNextLineupNumber(team);
  const targetInput = team === "home" ? homeNumberInput : awayNumberInput;
  targetInput.value = next === null ? "" : String(next);
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
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item) => {
      const nextItem = structuredClone(item);
      if (nextItem?.state?.match) {
        normalizeStateTeamNames(nextItem.state);
      }
      return nextItem;
    });
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
  normalizeStateTeamNames(state);
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
    const info = document.createElement("span");
    info.textContent = `${home} vs ${away} · ${when}`;
    li.append(info);

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
      captains: {
        home: { ...defaultState.captains.home, ...(parsed.captains?.home || {}) },
        away: { ...defaultState.captains.away, ...(parsed.captains?.away || {}) },
      },
      clock: { ...defaultState.clock, ...(parsed.clock || {}) },
    };

    if (!Object.values(CLOCK_PHASES).includes(merged.clock.phase)) {
      if (merged.clock.elapsedSeconds >= 2 * REGULAR_HALF_SECONDS) {
        merged.clock.phase = CLOCK_PHASES.secondHalfStoppage;
      } else if (merged.clock.elapsedSeconds >= REGULAR_HALF_SECONDS) {
        merged.clock.phase = CLOCK_PHASES.firstHalfStoppage;
      } else {
        merged.clock.phase = CLOCK_PHASES.firstHalf;
      }
    }

    if (merged.clock.running && merged.clock.lastTick === null) {
      merged.clock.lastTick = Date.now();
    }

    normalizeStateTeamNames(merged);

    if (merged.clock.phase === CLOCK_PHASES.finished) {
      merged.clock.running = false;
      merged.clock.lastTick = null;
      merged.clock.elapsedSeconds = 2 * REGULAR_HALF_SECONDS;
    }

    return merged;
  } catch {
    return structuredClone(defaultState);
  }
}

populateNumberSelect(homeNumberInput, "N° maglia");
populateNumberSelect(awayNumberInput, "N° maglia");
populateNumberSelect(eventPlayerNumberInput, "Seleziona numero");
populateNumberSelect(subInInput, "Seleziona numero");

applyCurrentDateTimeDefaults(state);
minuteInput.readOnly = autoMinuteInput.checked;
setEventMinuteFromClock();
syncClockIntervalWithState();
syncLineupNumberInputs();
syncAwayPlayerMode();
updateSubstitutionFields();
renderArchiveList();
render();
