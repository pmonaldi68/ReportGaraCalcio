# ReportGaraCalcio

Web app semplice (HTML/CSS/JS) per gestire una gara di calcio:

- dettagli gara (squadre da elenco campionato, data, orario, campo da elenco)
- formazioni casa/ospite con selezione capitano e vice capitano
- selezione giocatori CYNTHIA 1920 in formazione ospite solo quando ospite = CYNTHIA
- negli altri casi inserimento giocatore manuale
- numerazione formazione con selezione rapida da 1 a 99 (proposta automatica del prossimo numero)
- eventi partita con numero calciatore (gol, ammonizioni, espulsioni, sostituzioni, rigori sbagliati)
- cronometro gara 1°/2° tempo con stop automatico al 45' e 90' + gestione recupero e minuto automatico eventi
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
