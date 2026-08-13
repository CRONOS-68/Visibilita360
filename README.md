# Visibilita360 - Market Positioning Module (Parte A)

Sistema di analisi posizionamento di mercato e competitive intelligence usando **Kimi 3 API** per l'intelligenza artificiale.

## Architettura

```
┌─────────────────────────────────────────────────────┐
│       Express.js API Server                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐  ┌──────────────┐               │
│  │ Market Data  │  │ Positioning  │               │
│  │ Service      │  │ Generator    │               │
│  └──────────────┘  └──────────────┘               │
│         │                  │                       │
│         └──────────┬───────┘                       │
│                    │                               │
│          ┌─────────▼──────────┐                   │
│          │  Kimi 3 API Client │                   │
│          └─────────┬──────────┘                   │
│                    │                               │
│    ┌───────────────┘                              │
│    │                                               │
│    ▼                                               │
│  Kimi API (moonshot-v1-128k)                      │
│  https://api.moonshot.cn/v1                       │
│                                                   │
│  Database Layer: PostgreSQL                       │
│  ├─ companies                                     │
│  ├─ competitors                                   │
│  ├─ price_points                                 │
│  ├─ market_analysis                              │
│  ├─ positioning_reports                          │
│  └─ actions                                       │
│                                                   │
└─────────────────────────────────────────────────────┘
```

## Funzionalità Principali (Parte A)

### 1. **Registrazione Azienda**
Registra il profilo dell'azienda cliente:
- Nome, settore, descrizione
- Mercato target
- Dati aziendali (dipendenti, anno di fondazione)

### 2. **Gestione Competitor**
Traccia i competitor:
- Nome e settore
- Prodotti principali
- Posizione di mercato (leader, challenger, follower, niche)
- Livello di minaccia

### 3. **Monitoraggio Prezzi**
Raccoglie dati di pricing:
- Prezzo prodotto
- Modello pricing (subscription, one-time, freemium)
- Features incluse

### 4. **Analisi di Mercato**
Effettuata tramite **Kimi 3 API**:
- Dimensione mercato
- Tasso di crescita
- Trend chiave
- Opportunità e minacce

### 5. **Report di Posizionamento**
Report AI-powered generato da Kimi:
- Posizionamento attuale
- Vantaggi competitivi
- Debolezze
- Opportunità di gap di mercato
- Differenziazione consigliata
- Piano d'azione prioritizzato

### 6. **Strategia di Pricing**
Raccomandazioni di pricing tramite Kimi:
- Prezzo ottimale
- Modello pricing consigliato
- Tier pricing specifici
- Strategie di differenziazione

### 7. **Identificazione Opportunità di Mercato**
Opportunità identificate tramite Kimi:
- Gap di mercato non sfruttati
- Segmenti di clientela non serviti
- Modelli di business emergenti
- Espansione geografica

## Setup

### Prerequisiti
- Node.js 18+
- PostgreSQL 14+
- API Key per Kimi 3 (Moonshot AI)

### Installazione

```bash
# 1. Installa dipendenze
npm install

# 2. Configura variabili d'ambiente
cp .env.example .env

# 3. Configura il database PostgreSQL
# Modifica DB_HOST, DB_USER, DB_PASSWORD, DB_NAME in .env

# 4. Imposta API Key Kimi
# Ottieni da: https://console.moonshot.cn/
# Imposta KIMI_API_KEY in .env

# 5. Avvia il server
npm run dev
```

### Variabili d'Ambiente (.env)

```env
# Kimi 3 API
KIMI_API_KEY=your_kimi_api_key
KIMI_API_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=moonshot-v1-128k

# Database PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/visibilita360
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=visibilita360

# Server
PORT=3000
NODE_ENV=development
```

## API Endpoints

### Health Check
```bash
GET /api/v1/health
```

### Registra Azienda
```bash
POST /api/v1/companies
Content-Type: application/json

{
  "name": "TechStartup SRL",
  "industry": "SaaS",
  "description": "Piattaforma di automazione marketing per PMI",
  "target_market": "PMI italiane 10-50 dipendenti",
  "website": "https://techstartup.it",
  "employees_count": 12,
  "founded_year": 2020
}
```

**Response:**
```json
{
  "success": true,
  "company_id": "uuid-here",
  "company": { ... }
}
```

### Aggiungi Competitor
```bash
POST /api/v1/companies/{company_id}/competitors
Content-Type: application/json

{
  "competitor_name": "HubSpot",
  "competitor_industry": "SaaS/Marketing",
  "main_products": ["CRM", "Email Marketing", "Automation"],
  "market_position": "leader",
  "threat_level": "high",
  "website": "https://hubspot.com"
}
```

### Aggiungi Prezzo
```bash
POST /api/v1/competitors/{competitor_id}/pricing
Content-Type: application/json

{
  "product_name": "HubSpot Professional",
  "price": 890,
  "currency": "EUR",
  "pricing_model": "subscription",
  "features_included": ["CRM", "Email Marketing", "50k contacts", "Custom reports"]
}
```

### Ottieni Profilo Azienda
```bash
GET /api/v1/companies/{company_id}
```

### Genera Report di Posizionamento
```bash
POST /api/v1/companies/{company_id}/positioning-report
```

**Risposta:** Report di posizionamento con vantaggi competitivi, debolezze, opportunità generate da Kimi 3 API

### Genera Strategia di Pricing
```bash
POST /api/v1/companies/{company_id}/pricing-strategy
```

**Risposta:** Raccomandazioni pricing con tier ottimali calcolati da Kimi

### Identifica Opportunità di Mercato
```bash
POST /api/v1/companies/{company_id}/market-opportunities
```

**Risposta:** Opportunità di gap di mercato, segmenti non serviti, azioni consigliate

## Flusso d'Uso

### Scenario: Analisi PMI Software
```
1. POST /companies
   ↓ Registra "SoftwarePMI SRL"
   ↓ Riceve: company_id = "abc-123"

2. POST /companies/abc-123/competitors
   ↓ Aggiungi 3-5 competitor principali
   ↓ HubSpot, Pipedrive, Freshsales, Monday.com

3. POST /competitors/{comp_id}/pricing
   ↓ Raccogli prezzi per ogni competitor
   ↓ Modelli, tier, features

4. POST /companies/abc-123/positioning-report
   ↓ Kimi analizza:
   │ - Dati azienda
   │ - Competitor intelligence
   │ - Prezzi mercato
   │ - Trend industria
   ↓ Restituisce:
   │ - Posizionamento attuale
   │ - Vantaggi/Debolezze
   │ - Opportunità
   │ - Piano d'azione prioritizzato

5. POST /companies/abc-123/pricing-strategy
   ↓ Kimi raccomanda:
   │ - Prezzo ottimale
   │ - Tier pricing
   │ - Strategie differenziazione

6. POST /companies/abc-123/market-opportunities
   ↓ Kimi identifica:
   │ - Gap di mercato
   │ - Nuovi segmenti
   │ - Modelli emergenti
```

## Database Schema

### companies
Profilo aziendale cliente

### competitors
Profilo competitor con posizionamento

### price_points
Dati di pricing per ogni prodotto competitor

### market_analysis
Analisi di mercato (trend, dimensione, opportunità)

### positioning_reports
Report di posizionamento generato da Kimi

### actions
Piano d'azione con priorità e timeline

## Stack Tecnico

- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL
- **AI:** Kimi 3 API (Moonshot)
- **HTTP Client:** Axios

## Note sulla Parte B (Customer Support Agent)

La **Parte B** (Customer Support Agent con canali Telegram/WhatsApp/Email) è **NON TOCCARE** per ora.
Rimane per fase successiva di sviluppo.

## Prossimi Step

1. Integrare web UI per visualizzare report
2. Aggiungere export PDF per positioning report
3. Implementare webhook per aggiornamenti competitor
4. Dashboard analytics per tracking KPI
5. Scheduling automatico di re-analysis mensili

## License

Proprietary - Visibilita360
