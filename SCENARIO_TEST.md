# Scenario Test - Market Positioning Module

Guida step-by-step per testare il sistema con un caso realistico.

## Scenario: "InvoiceAI" - PMI italiana SaaS per fatturazione

### Azienda
- Nome: InvoiceAI SRL
- Settore: SaaS / Fintech
- Descrizione: Piattaforma di fatturazione intelligente con AI per PMI
- Mercato Target: PMI italiane 5-50 dipendenti
- Dipendenti: 8
- Fondazione: 2022
- Sito: https://invoiceai.it

### Competitor 1: Fatture in Cloud
- Nome: Fatture in Cloud
- Settore: SaaS / Fintech
- Posizione: Leader
- Minaccia: High
- Prodotti: Fatturazione, CRM, E-commerce, Gestione Magazzino

**Prezzi:**
- Start: €60/mese (fatturazione base)
- Growing: €120/mese (+ CRM)
- Professional: €240/mese (+ E-commerce)

### Competitor 2: Zoho Books
- Nome: Zoho Books
- Settore: SaaS / Business Management
- Posizione: Leader
- Minaccia: High
- Prodotti: Fatturazione, Contabilità, Inventory, Expense Tracking

**Prezzi:**
- Free: €0 (limitato)
- Basic: €24/mese
- Standard: €73/mese
- Professional: €181/mese

### Competitor 3: Wave
- Nome: Wave
- Settore: SaaS / Accounting
- Posizione: Challenger
- Minaccia: Medium
- Prodotti: Fatturazione gratuita, Contabilità, Payroll

**Prezzi:**
- Free: €0 (fatturazione gratuita)
- Payroll: €19/mese per dipendente

### Competitor 4: Ragioneria Online
- Nome: Ragioneria Online
- Settore: Consulenza / Software
- Posizione: Follower
- Minaccia: Low
- Prodotti: Fatturazione base, Consultazione tributaria

**Prezzi:**
- Piano Base: €90/mese

---

## Test API - Comandi cURL

### 1. Health Check
```bash
curl -X GET http://localhost:3000/api/v1/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "database": "connected",
  "kimi_api": "connected",
  "timestamp": "2026-08-13T10:30:00Z"
}
```

### 2. Registra InvoiceAI
```bash
curl -X POST http://localhost:3000/api/v1/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "InvoiceAI SRL",
    "industry": "SaaS / Fintech",
    "description": "Piattaforma di fatturazione intelligente con AI per PMI italiane",
    "target_market": "PMI italiane 5-50 dipendenti",
    "website": "https://invoiceai.it",
    "employees_count": 8,
    "founded_year": 2022
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "company": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "InvoiceAI SRL",
    ...
  }
}
```

### 3. Aggiungi Competitor: Fatture in Cloud
```bash
# Salva company_id da risposta precedente
COMPANY_ID="550e8400-e29b-41d4-a716-446655440000"

curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_name": "Fatture in Cloud",
    "competitor_industry": "SaaS / Fintech",
    "main_products": ["Fatturazione", "CRM", "E-commerce", "Magazzino"],
    "market_position": "leader",
    "threat_level": "high",
    "website": "https://fattureincloud.it"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "competitor_id": "660e8400-e29b-41d4-a716-446655440111",
  "competitor": { ... }
}
```

### 4. Aggiungi Prezzi Fatture in Cloud
```bash
COMPETITOR_ID="660e8400-e29b-41d4-a716-446655440111"

# Prezzo Start
curl -X POST http://localhost:3000/api/v1/competitors/$COMPETITOR_ID/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Fatture in Cloud - Start",
    "price": 60,
    "currency": "EUR",
    "pricing_model": "subscription",
    "features_included": ["Fatturazione illimitata", "Gestione documenti", "Dashboard"]
  }'

# Prezzo Growing
curl -X POST http://localhost:3000/api/v1/competitors/$COMPETITOR_ID/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Fatture in Cloud - Growing",
    "price": 120,
    "currency": "EUR",
    "pricing_model": "subscription",
    "features_included": ["Start features", "CRM", "Gestione Contatti"]
  }'

# Prezzo Professional
curl -X POST http://localhost:3000/api/v1/competitors/$COMPETITOR_ID/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Fatture in Cloud - Professional",
    "price": 240,
    "currency": "EUR",
    "pricing_model": "subscription",
    "features_included": ["Growing features", "E-commerce", "Inventory"]
  }'
```

### 5. Ripeti per Zoho, Wave, Ragioneria Online
```bash
# Zoho Books
curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_name": "Zoho Books",
    "competitor_industry": "SaaS / Business",
    "main_products": ["Fatturazione", "Contabilità", "Inventory"],
    "market_position": "leader",
    "threat_level": "high"
  }'

# Wave
curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_name": "Wave",
    "competitor_industry": "SaaS / Accounting",
    "main_products": ["Fatturazione gratuita", "Contabilità", "Payroll"],
    "market_position": "challenger",
    "threat_level": "medium"
  }'

# Ragioneria Online
curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_name": "Ragioneria Online",
    "competitor_industry": "Consulenza / Software",
    "main_products": ["Fatturazione", "Consulenza tributaria"],
    "market_position": "follower",
    "threat_level": "low"
  }'
```

### 6. Genera Report di Posizionamento
```bash
curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/positioning-report
```

**Response:**
```json
{
  "status": "generating",
  "message": "Report generation started..."
}
```

Attendere ~ 30 secondi, poi:

```bash
# Consulta nel database il report generato
psql -U postgres -d visibilita360 -c \
  "SELECT * FROM positioning_reports WHERE company_id = '$COMPANY_ID' ORDER BY generated_at DESC LIMIT 1;"
```

**Expected Output:**
```
Report di Posizionamento per InvoiceAI:

VANTAGGI COMPETITIVI:
- AI integrata per automazione contabile
- UX moderno e intuitivo
- Focus su PMI italiane
- Pricing competitivo vs leader

DEBOLEZZE:
- Brand awareness basso vs Fatture in Cloud
- Mancanza di funzionalità avanzate (Magazzino, E-commerce)
- Team piccolo

OPPORTUNITÀ:
- Mercato SMB italiano in crescita
- Trend verso automazione AI
- Gap nel segmento micro-imprese (<10 dipendenti)
- Differenziazione su servizi di consulenza

PIANO D'AZIONE:
1. (ALTA) Sviluppare integrazione con banche italiane
2. (ALTA) Aggiungere modulo gestione spese/DDT
3. (MEDIA) Marketing localizzato per PMI
4. (MEDIA) Partnership con consulenti tributari
```

### 7. Genera Strategia di Pricing
```bash
curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/pricing-strategy \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "strategy_summary": "InvoiceAI dovrebbe posizionarsi come alternativa premium ma più economica di Fatture in Cloud, offrendo AI integrata come differenziatore...",
  "pricing_tiers": [
    {
      "tier": "Startup",
      "price": 45,
      "features": ["Fatturazione illimitata", "AI suggestion per categorizzazione", "Max 100 fatture/mese"]
    },
    {
      "tier": "Growth",
      "price": 89,
      "features": ["Startup features", "Unlimited fatture", "Integrazione bancaria", "Advanced AI"]
    },
    {
      "tier": "Enterprise",
      "price": 199,
      "features": ["Growth features", "API access", "Custom integrations", "Dedicated support"]
    }
  ],
  "top_recommendations": [
    "Posizionarsi 20-30% sotto Fatture in Cloud su tier equivalenti",
    "Evidenziare AI come unico differenziatore nel mercato",
    "Offrire free tier basic per acquisizione utenti"
  ]
}
```

### 8. Identifica Opportunità di Mercato
```bash
curl -X POST http://localhost:3000/api/v1/companies/$COMPANY_ID/market-opportunities
```

**Expected Response:**
```json
{
  "success": true,
  "opportunities": [
    "Espandere in mercato spagnolo / portoghese con UI multilingua",
    "Sviluppare modulo bancario per PMI che fanno export",
    "Integrazioni con piattaforme e-commerce (WooCommerce, Shopify)"
  ],
  "market_gaps": [
    "Nessuna soluzione italiana specializzata in micro-imprese (<3 dipendenti)",
    "Manca strumento gratuito con AI che Zoho e Wave non offrono",
    "Gap nel supporto post-vendita locale"
  ],
  "recommended_actions": [
    "Lanciare tier Free con limitazioni per market share",
    "Sviluppare API marketplace per integrazioni community",
    "Costruire community di PMI italiane (Slack, Forum)"
  ]
}
```

---

## Risultati Attesi

Dopo questi step, il sistema avrà:

✅ Profilo completo di InvoiceAI
✅ 4 Competitor tracciati
✅ ~12 price point raccolti
✅ Report di posizionamento AI-powered da Kimi
✅ Strategie di pricing consigliate
✅ Opportunità di mercato identificate

**Tempo totale:** ~2-3 minuti

---

## Monitoraggio Database

```bash
# Connettiti al DB
psql -U postgres -d visibilita360

# Visualizza companies
SELECT id, name, industry FROM companies;

# Visualizza competitors di una company
SELECT * FROM competitors WHERE company_id = 'company-id-here';

# Visualizza pricing points
SELECT * FROM price_points ORDER BY product_name;

# Visualizza report generati
SELECT id, company_id, generated_at FROM positioning_reports ORDER BY generated_at DESC;
```

---

## Troubleshooting

### Kimi API Connection Error
```
Error: Failed to analyze market positioning: KIMI_API_KEY not configured
```
→ Verifica di aver impostato `KIMI_API_KEY` in `.env` e che sia valida

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
→ Verifica che PostgreSQL sia in esecuzione e credentials in `.env` siano corrette

### Schema Not Initialized
```
Error: relation "companies" does not exist
```
→ Verifica che il server abbia completato l'inicializzazione schema
