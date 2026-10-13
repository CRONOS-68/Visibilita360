# Procedura: usare REA nel report sulla concorrenza

Questa procedura vale **ogni volta che prepariamo un report sulla concorrenza**.
REA si usa solo se richiamato espressamente (vedi `.claude/hooks/rea-gate.sh`).

## 1. Regola di attivazione
Il messaggio deve contenere **"usa rea"** (o "utilizza rea", "use rea").
Il permesso vale solo per quel messaggio: nei messaggi successivi va ripetuto.

Esempio:
> usa rea per analizzare il sito pubblico https://esempio-competitor.it per il cliente [Nome]: tecnologie, tracciamenti, percorso di contatto, servizi esterni. Compila il modello in `docs/report-concorrenza/MODELLO_REPORT.md`.

## 2. Prima di iniziare (checklist ambito)
- [ ] Il sito è pubblico e accessibile a qualunque visitatore.
- [ ] Nessun login, area riservata o protezione da aggirare.
- [ ] Nessuna raccolta di dati personali.
- [ ] Il competitor è stato indicato dal cliente (o è nel suo mercato dichiarato).
- [ ] Nessun uso di REA su software o servizi di cui non abbiamo il diritto di analizzare il comportamento.

## 3. Cosa chiedere a REA
Analisi web di una pagina pubblica, in sola osservazione:
1. Struttura e script della pagina (`inspect_web_page`, `analyze_web_bundle`)
2. Richieste di rete e servizi esterni (`observe_web_session`, `inspect_web_network_capture`)
3. Schermate datate (`capture_web_screenshot`)
4. Percorso di contatto: passaggi e campi del modulo

Per il monitoraggio mensile: confronto con la rilevazione precedente (`compare_web_captures`, `compare_web_screenshots`).

## 4. Compilare il report
1. Copia `MODELLO_REPORT.md` in una cartella per cliente.
2. Inserisci ogni dato con fonte, data e certezza (Osservato / Dedotto / Non verificabile).
3. Tieni separati ciò che REA ha visto e ciò che deduciamo.
4. Compila il confronto con il sito del cliente e il piano a 30 giorni.

## 5. Controllo qualità prima della consegna
- [ ] Nessun dato di fatturato, traffico o budget presentato come certo.
- [ ] Ogni affermazione tecnica ha una evidenza nel registro (sezione 7).
- [ ] Schermate e date presenti.
- [ ] Azioni concrete e collegate ai nostri servizi.
- [ ] Nessun dato personale nei file allegati.

## 6. Monitoraggio mensile
Ripeti l'analisi con "usa rea ..." ogni mese, confronta con la precedente e compila la sezione 5 (Cosa è cambiato).

## 7. Cosa non fare
- Non usare REA per aggirare login, protezioni anti-bot, licenze o sistemi anti-frode.
- Non copiare codice, testi o grafica proprietaria del competitor.
- Non promettere dati non osservabili.
- Non eseguire analisi automatiche in serie senza controllo umano: il blocco "usa rea" esiste per questo.
