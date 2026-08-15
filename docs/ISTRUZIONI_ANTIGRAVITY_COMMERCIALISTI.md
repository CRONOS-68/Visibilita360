# Istruzioni per Antigravity — Enrichment DB "Studi Commercialisti"

Documento operativo da incollare così com'è (sezione "Prompt per Antigravity")
in Antigravity per far raccogliere nominativi di studi commercialisti da
importare nel CRM di Visibilita360. I campi richiesti sono già allineati alla
tabella `commercialisti_leads` (`src/database/schema.sql`) e al template CSV
in `data/templates/commercialisti_leads_template.csv`, quindi l'output può
essere importato senza rimappare colonne.

## Parametri da personalizzare prima dell'uso

Prima di lanciare la ricerca, sostituisci questi valori con quelli reali:

| Parametro | Default proposto | Note |
|---|---|---|
| Area geografica | Italia, priorità a capoluoghi di provincia >50.000 abitanti | Restringi a regioni/città se hai già zone target |
| Numero di studi da raccogliere | 200 | Alza/abbassa in base al carico che il team commerciale può gestire |
| Dimensione studio | Da 1 a 20 dipendenti (esclude big four / grandi network) | Coerente con target "PMI" di Visibilita360 |
| Specializzazione preferita | Fiscale, contabilità PMI, consulenza societaria | Escludi studi mono-tema non affini (es. solo revisione legale) |

## Prompt per Antigravity

```
Obiettivo: raccogliere un elenco di studi commercialisti italiani da inserire
come lead in un CRM. Non inventare mai dati: se un campo non è verificabile,
lascialo vuoto e scrivilo in "note".

Ambito di ricerca:
- Area geografica: [AREA GEOGRAFICA]
- Numero target di studi: [NUMERO TARGET]
- Dimensione studio: [DIMENSIONE STUDIO]
- Specializzazione preferita: [SPECIALIZZAZIONE]
- Escludi: grandi network internazionali (Big Four e simili), studi senza
  sito web o recapiti verificabili, doppioni (stesso studio già raccolto).

Fonti da usare, in ordine di priorità:
1. Albo ufficiale ODCEC (Ordine dei Dottori Commercialisti e degli Esperti
   Contabili) — portale del CNDCEC o dei singoli Ordini territoriali:
   fonte più affidabile per ragione sociale, numero di iscrizione e ordine
   territoriale.
2. INI-PEC (registro pubblico degli indirizzi PEC di imprese e
   professionisti): per verificare/recuperare la PEC ufficiale.
3. Sito web ufficiale dello studio: per descrizione, specializzazioni,
   team, contatti, sede.
4. Google Maps / Google Business Profile: per indirizzo, telefono, orari,
   recensioni come indicatore di attività.
5. LinkedIn (pagina azienda dello studio e profilo del socio/titolare):
   per referente, ruolo, dimensione team.
6. Registro Imprese / Camera di Commercio: per partita IVA, codice fiscale,
   forma giuridica, anno di costituzione, numero dipendenti se disponibile.

Per ciascuno studio individuato, raccogli questi campi (nome colonna =
intestazione da usare nel CSV di output):

- ragione_sociale (obbligatorio): nome/ragione sociale dello studio
- forma_giuridica: es. "Studio individuale", "Studio associato", "STP srl"
- partita_iva: 11 cifre, senza spazi
- codice_fiscale
- numero_iscrizione_albo: numero di iscrizione all'ODCEC
- ordine_territoriale: es. "ODCEC Milano"
- indirizzo: via e numero civico
- cap
- citta
- provincia: sigla, es. "MI"
- regione
- telefono: numero principale dello studio
- email: email generica dello studio (es. info@...), NON email personali
  trovate casualmente
- pec: indirizzo PEC ufficiale (verificato su INI-PEC quando possibile)
- sito_web: URL completo con https://
- numero_dipendenti_stimato: numero intero, stima se non dichiarato
  esplicitamente (indicalo in note come "stima")
- anno_fondazione: se riportato dallo studio o dal Registro Imprese
- specializzazioni: elenco separato da ";" (es. "fiscale;societario;lavoro")
- descrizione: 1-2 frasi su posizionamento e servizi principali
- target_clienti: es. "PMI", "startup", "privati", "grandi aziende"
- referente_nome: nome del socio fondatore o titolare principale
- referente_ruolo: es. "Socio fondatore", "Titolare"
- linkedin_studio: URL pagina LinkedIn aziendale, se esiste
- linkedin_referente: URL profilo LinkedIn del referente, se pubblico
- fonte: URL della pagina principale da cui hai preso i dati (per
  tracciabilità e verifica successiva)
- data_rilevazione: data di oggi in formato AAAA-MM-GG
- note: qualunque ambiguità, stima, o dato mancante da segnalare

Regole di qualità:
- Non inventare o dedurre partita IVA, PEC o numero di iscrizione: se non
  li trovi da una fonte verificabile, lascia il campo vuoto.
- Prima di aggiungere uno studio, verifica che il sito web o la pagina
  Google Business risultino attivi/aggiornati (evita studi chiusi o
  inattivi).
- Deduplica per partita_iva quando disponibile, altrimenti per
  ragione_sociale + citta.
- Preferisci canali di contatto aziendali (email generica, PEC, telefono
  dello studio) a recapiti personali dei singoli professionisti.
- Cita sempre la fonte nel campo "fonte".

Formato di output:
- Un unico file CSV, encoding UTF-8, separatore virgola, con la stessa
  intestazione del template (vedi sotto).
- Se un campo contiene la virgola, racchiudilo tra virgolette doppie.
- Non lasciare righe vuote né duplicati.
- Consegna il file con nome:
  commercialisti_leads_[AREA GEOGRAFICA]_[DATA].csv

Intestazione CSV esatta da usare (nell'ordine):
ragione_sociale,forma_giuridica,partita_iva,codice_fiscale,numero_iscrizione_albo,ordine_territoriale,indirizzo,cap,citta,provincia,regione,telefono,email,pec,sito_web,numero_dipendenti_stimato,anno_fondazione,specializzazioni,descrizione,target_clienti,referente_nome,referente_ruolo,linkedin_studio,linkedin_referente,fonte,data_rilevazione,note
```

## Nota privacy / GDPR

I dati richiesti sono dati aziendali (B2B): ragione sociale, PEC, email
generica, telefono dello studio, sede. Questo tipo di trattamento per
finalità di prospezione commerciale B2B rientra generalmente nel legittimo
interesse, ma vanno rispettate le regole sul cosiddetto "soft spam" (art.
130 Codice Privacy) per eventuali comunicazioni via email: identificare
sempre il mittente, offrire modalità di opt-out semplice nella prima
comunicazione, non raccogliere né usare indirizzi email personali dei
singoli professionisti se non resi pubblici a fini professionali (es. sul
sito dello studio o su LinkedIn).

## Come importare i dati raccolti nel DB

Una volta ricevuto il CSV compilato da Antigravity (con le stesse colonne
del template), puoi importarlo direttamente nella tabella
`commercialisti_leads`:

```bash
psql "$DATABASE_URL" -c "\copy commercialisti_leads (ragione_sociale, forma_giuridica, partita_iva, codice_fiscale, numero_iscrizione_albo, ordine_territoriale, indirizzo, cap, citta, provincia, regione, telefono, email, pec, sito_web, numero_dipendenti_stimato, anno_fondazione, specializzazioni, descrizione, target_clienti, referente_nome, referente_ruolo, linkedin_studio, linkedin_referente, fonte, data_rilevazione, note) FROM 'commercialisti_leads_AREA_DATA.csv' WITH (FORMAT csv, HEADER true)"
```

Nota: la tabella genera automaticamente `id`, `stato_lead` (default
`'nuovo'`) e i timestamp, quindi non vanno inclusi nel CSV importato. Dopo
l'import, ogni riga in `commercialisti_leads` è un lead con
`stato_lead = 'nuovo'`, pronto per essere lavorato dal team commerciale e,
se qualificato, collegato/promosso a un record in `companies` valorizzando
`company_id`.
