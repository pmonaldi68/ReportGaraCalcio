# ReportGaraCalcio

Web app semplice (HTML/CSS/JS) per gestire una gara di calcio:

- dettagli gara (squadre da elenco campionato, data, orario, campo da elenco, arbitro)
- formazioni casa/ospite
- selezione giocatori CYNTHIA 1920 in formazione ospite solo quando ospite = CYNTHIA
- negli altri casi inserimento giocatore manuale
- numerazione automatica formazione da 1 a 20 (incrementale)
- eventi partita con numero calciatore (gol, ammonizioni, espulsioni, sostituzioni, rigori sbagliati)
- cronometro gara con minuto automatico per gli eventi
- cronologia eventi con eliminazione
- archiviazione locale di più gare (carica/elimina archivio)
- esportazione/condivisione PDF tramite stampa browser
- punteggio automatico e statistiche disciplinari
- persistenza locale tramite `localStorage`

## Avvio locale

Apri direttamente `index.html` nel browser oppure usa un server statico:

```bash
python3 -m http.server 4173
```

Poi visita `http://localhost:4173`.
