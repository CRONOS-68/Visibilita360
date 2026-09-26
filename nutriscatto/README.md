# NutriScatto

App per telefono (PWA) che conta **calorie, zuccheri, proteine e grassi** partendo dalla **foto del piatto**, dal **codice a barre** o dalla **tabella nutrizionale** della confezione, con **curva glicemica stimata**, **diario del peso** e **tachimetro** delle calorie giornaliere.

## Cosa fa

| Funzione | Come |
|---|---|
| Foto del piatto | L'intelligenza artificiale (OpenAI o Claude, a scelta) riconosce gli alimenti, **stima i grammi** con riferimenti visivi (diametro del piatto, posate, bicchiere) e restituisce valori per 100 g e indice glicemico. Puoi aggiungere indicazioni ("piatto fondo, 80 g di pasta a crudo") e correggere i grammi prima di salvare. |
| Codice a barre | Scansione live con la fotocamera (BarcodeDetector nativo o ZXing su iPhone), oppure foto del codice, oppure numero digitato. Valori da [Open Food Facts](https://world.openfoodfacts.org). |
| Etichetta | Se il prodotto non è nel database, fotografi la tabella nutrizionale e l'AI la legge (valori per 100 g e porzione). |
| A mano / pasti recenti | Inserimento manuale (per 100 g o per porzione) e "Ripeti un pasto recente" con un tocco. |
| Tachimetro | Limite **1400 kcal**: verde fino a 1000, giallo 1000-1200, arancio 1200-1400, rosso oltre. **Si azzera a mezzanotte**; lo storico resta nel grafico degli ultimi 7 giorni. |
| Glicemia | Curva stimata della giornata a partire dalla glicemia a digiuno (**100 mg/dL** all'inizio, obiettivo **90**), con picco, carico glicemico e minuti sopra 140. Puoi registrare le misure del glucometro: quelle a digiuno aggiornano il riferimento del modello e disegnano l'andamento verso 90. |
| Peso | Diario delle pesate, obiettivo **−3 kg** dal peso di partenza, tendenza settimanale, data prevista e stima del deficit dal profilo (sesso, età, altezza, attività). |

Tutti i dati restano **sul telefono** (localStorage), con esportazione/importazione del backup in JSON. Le foto passano dal tuo server all'API di OpenAI o Claude solo per l'analisi e non vengono salvate sul server; sul telefono resta una miniatura per 14 giorni.

## Architettura

```
Telefono (PWA React)                          Server Node (server/server.mjs)
 ├─ dati in localStorage                       ├─ serve l'app compilata (dist/)
 ├─ Open Food Facts (diretto dal browser) ───┐ └─ POST /api/analyze ──► API Claude
 └─ foto ridotte a 1568 px ── /api/analyze ──┘      o API OpenAI (la chiave resta sul server)
```

- `src/lib/glucose.ts` modello glicemico, `src/lib/gi.ts` stima indice glicemico, `src/lib/gauge.ts` fasce del tachimetro, `src/lib/weight.ts` statistiche peso.
- `server/analyze.mjs` prompt e schema JSON comuni, con due fornitori: OpenAI (Chat Completions con output strutturato) e Claude (structured outputs, con fallback automatico se il modello declina).

## Avvio in locale

Serve Node.js 20 o superiore.

```bash
cd nutriscatto
npm install
cp .env.example .env        # inserisci OPENAI_API_KEY (o ANTHROPIC_API_KEY)
npm run build
npm start                   # http://localhost:8787
```

Sviluppo con ricarica automatica: `npm run dev:api` in un terminale e `npm run dev` in un altro (Vite su http://localhost:5173, le chiamate `/api` vanno al server).

Test: `npm test` · controllo tipi: `npm run typecheck`.

## Usarla sul telefono

La fotocamera "live" (scansione del codice a barre in tempo reale) funziona solo in **HTTPS**. Tre strade:

1. **VPS con dominio (consigliata)** – vedi sotto. Poi dal telefono apri il sito e usa *Condividi → Aggiungi alla schermata Home* (iPhone) o *Installa app* (Android): si apre a schermo intero e i dati non vengono cancellati dal browser.
2. **Rete di casa, senza HTTPS** – `npm start` sul PC e apri `http://IP-DEL-PC:8787` dal telefono: foto del piatto, etichetta e *foto del codice a barre* funzionano; manca solo la scansione live.
3. **Tunnel temporaneo** (es. `cloudflared tunnel --url http://localhost:8787`) per avere subito un indirizzo HTTPS di prova.

### Deploy su VPS

```bash
git clone … && cd nutriscatto
npm ci && npm run build
cp .env.example .env   # OPENAI_API_KEY (o ANTHROPIC_API_KEY) e APP_TOKEN (una stringa lunga a caso)
```

Servizio systemd (`/etc/systemd/system/nutriscatto.service`):

```ini
[Unit]
Description=NutriScatto
After=network.target

[Service]
WorkingDirectory=/opt/nutriscatto
ExecStart=/usr/bin/node server/server.mjs
Restart=always
User=www-data

[Install]
WantedBy=multi-user.target
```

Nginx davanti (HTTPS con certbot); **alza il limite del corpo** perché le foto superano 1 MB in base64:

```nginx
server {
  server_name calorie.tuodominio.it;
  client_max_body_size 10m;
  location / { proxy_pass http://127.0.0.1:8787; proxy_set_header Host $host; }
}
```

In alternativa Caddy (`calorie.tuodominio.it { reverse_proxy 127.0.0.1:8787 }`) gestisce da solo il certificato.

Se il server è su internet imposta **APP_TOKEN** e inseriscilo nell'app in *Profilo → Token server*: senza token chiunque trovi l'indirizzo potrebbe usare la tua chiave API. Il server limita comunque a 40 analisi ogni 10 minuti per IP.

## Configurazione (`.env`)

| Variabile | Default | Note |
|---|---|---|
| `OPENAI_API_KEY` | – | Chiave OpenAI per foto ed etichette. |
| `ANTHROPIC_API_KEY` | – | In alternativa, chiave Anthropic (Claude). Ne basta una. |
| `AI_PROVIDER` | automatico | `openai` o `anthropic`, solo se hai entrambe le chiavi (senza, vince Anthropic). |
| `OPENAI_MODEL` | `gpt-5.5` | Qualsiasi modello OpenAI con visione e output strutturato. |
| `OPENAI_EFFORT` | `medium` | `low`/`medium`/`high`; lascialo **vuoto** con modelli senza ragionamento (es. `gpt-4.1`). |
| `CLAUDE_MODEL` | `claude-opus-5` | `claude-sonnet-5` costa meno, con stime un po' meno precise. |
| `CLAUDE_EFFORT` | `medium` | `high` = più ragionamento e attesa più lunga; `low` = più veloce. |
| `APP_TOKEN` | vuoto | Consigliato se il server è pubblico. |
| `PORT` | 8787 | |
| `TLS_CERT`, `TLS_KEY` | – | HTTPS direttamente da Node, senza proxy. |

**Costo indicativo**: pochi centesimi per foto (circa 2.000 token in ingresso tra foto e istruzioni, più la risposta); il prezzo esatto dipende dal modello scelto. Codice a barre e inserimento manuale sono gratuiti.

La chiave va **solo** nel file `.env` sul server: non nel telefono e mai su GitHub (`.env` è già escluso da git).

## Il modello glicemico

Stima **indicativa** (non è un dispositivo medico):

- ogni pasto aggiunge alla glicemia a digiuno una curva a campana `A · (t/tp)^2.2 · e^(2.2(1 − t/tp))`;
- l'ampiezza `A` cresce con il **carico glicemico** (IG × carboidrati / 100, con saturazione per carichi alti), è ridotta da grassi e proteine e del 30% con una camminata dopo il pasto;
- il tempo al picco `tp` parte da 35 minuti e si allunga con grassi e proteine (massimo 90);
- la sensibilità cresce con la glicemia a digiuno (a 100 mg/dL i picchi sono circa il 20% più ampi che a 90).

Il confronto con le misure reali del glucometro (punti arancioni sul grafico) dice quanto la stima è vicina alla tua risposta personale.

## Note

- I valori stimati da foto hanno un margine d'errore (tipicamente ±20-30% sulle porzioni): per i cibi che mangi spesso conviene pesare una volta e poi usare *Ripeti un pasto recente*.
- Dati prodotti da Open Food Facts, licenza ODbL.
- L'app non sostituisce il parere del medico o del nutrizionista.
