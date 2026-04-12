# Mobile Optimization Plan (ReportGaraCalcio)

## Principi guida
- **Mobile-first**: ogni decisione è ottimizzata per schermi piccoli e uso con una mano.
- **Speed-first**: minimizzare il tempo tra apertura app e prima azione utile.
- **Task-first UX**: i flussi principali devono richiedere il minor numero possibile di tap.

## KPI target
- Tempo avvio schermata principale (p95): **< 1.5s**.
- Tempo apertura form report (p95): **< 800ms**.
- Tempo submit report (p95): **< 2s** in rete buona.
- Completion rate del flusso principale: **+20%** rispetto alla baseline.

## Backlog priorizzato

### P0 — Impatto immediato su velocità e intuitività
1. **Home orientata all'azione primaria**
   - CTA principale sempre visibile (es. "Nuovo report").
   - Riduzione elementi secondari in home.
2. **Form a step brevi**
   - Suddivisione in sezioni da 3–5 campi.
   - Progress indicator e stato bozza automatico.
3. **Validazione inline e tastiere corrette**
   - Errori mostrati vicino al campo.
   - Input type coerente (number, date, tel, email).
4. **Caching locale dei dati statici**
   - Lookup frequenti (squadre/campi/categorie) in cache.
   - Aggiornamento cache in background.
5. **Submit resiliente (offline queue)**
   - Se assente rete: salvataggio in coda locale.
   - Retry automatico quando la rete torna disponibile.

### P1 — Miglioramento UX avanzato
1. **Skeleton loading leggero** su schermate lente.
2. **Riduzione payload API** e chiamate ridondanti.
3. **Feedback rapido** con toast/snackbar per azioni chiave.
4. **Accessibilità**: contrasto, target minimi 44x44, label esplicite.

### P2 — Hardening e controllo qualità
1. **Telemetry KPI** lato client (timing e errori).
2. **Test E2E** sul flusso principale mobile.
3. **Feature flags** per rollout graduale.

## Piano di implementazione a sprint

### Sprint 1 (P0)
- Home action-first.
- Form multi-step + autosave bozza.
- Validazioni e input mobile-optimized.

### Sprint 2 (P0/P1)
- Cache locale + sync background.
- Submit con queue offline.
- Skeleton loading + feedback utente.

### Sprint 3 (P1/P2)
- Ottimizzazione API/payload.
- Telemetry KPI e dashboard base.
- Test E2E del percorso principale.

## Definizione di "done"
Una release è considerata pronta quando:
- i KPI p95 definiti sono rispettati;
- il flusso principale è completabile senza blocchi offline;
- il numero medio di tap nel flusso principale è ridotto;
- non ci sono regressioni critiche di usabilità mobile.
