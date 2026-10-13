# Visibilita360 — note per Claude

## Report sulla concorrenza
- Per ogni report sulla concorrenza segui `docs/report-concorrenza/PROCEDURA_REA.md` e compila `docs/report-concorrenza/MODELLO_REPORT.md`.
- La parte tecnica (tecnologie, tracciamenti, percorso di contatto) si fa con REA, ma **solo se il messaggio dell'utente contiene "usa rea"**. Il gate è in `.claude/hooks/rea-gate.sh`.
- Se l'utente chiede un report sulla concorrenza senza scrivere "usa rea", proponi di usare REA e chiedigli di ripetere la richiesta con "usa rea ...". Non aggirare il gate.
- Analizza solo siti pubblici, senza login né dati personali. Etichetta ogni dato: Osservato / Dedotto / Non verificabile.
