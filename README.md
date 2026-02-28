# ReportGaraCalcio

Web app semplice (HTML/CSS/JS) per gestire una gara di calcio:

- dettagli gara (squadre, data, orario, stadio, arbitro)
- formazioni casa/ospite
- eventi partita (gol, tiri in porta, falli, ammonizioni, espulsioni, sostituzioni, rigori sbagliati)
- cronometro gara con minuto automatico per gli eventi
- cronologia eventi con eliminazione
- punteggio automatico e statistiche disciplinari
- pannello "Match Stats" in stile dashboard (possesso, tiri in porta, falli, cartellini)
- persistenza locale tramite `localStorage`

## Avvio locale

Apri direttamente `index.html` nel browser oppure usa un server statico:

```bash
python3 -m http.server 4173
```

Poi visita `http://localhost:4173`.
