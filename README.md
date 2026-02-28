# ReportGaraCalcio

Web app semplice (HTML/CSS/JS) per gestire una gara di calcio:

- dettagli gara (squadre, data, orario, stadio, arbitro)
- formazioni casa/ospite
- selezione rapida giocatori CYNTHIA 1920 per la formazione casa
- numerazione formazione a selezione da 1 a 20
- eventi partita (gol, ammonizioni, espulsioni, sostituzioni, rigori sbagliati)
- cronometro gara con minuto automatico per gli eventi
- cronologia eventi con eliminazione
- punteggio automatico e statistiche disciplinari
- persistenza locale tramite `localStorage`

## Avvio locale

Apri direttamente `index.html` nel browser oppure usa un server statico:

```bash
python3 -m http.server 4173
```

Poi visita `http://localhost:4173`.
