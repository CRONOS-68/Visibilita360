# 🧪 Test Data - Scenario Completo

Dati di test per validare il sistema end-to-end.

---

## 📋 Test Scenario 1: E-Commerce SaaS

### Step 1: Registra Azienda
```json
{
  "name": "ShopFlow SRL",
  "industry": "SaaS / E-Commerce",
  "description": "Piattaforma di gestione e-commerce per negozi online con AI",
  "target_market": "Negozi online 5-100 prodotti",
  "website": "https://shopflow.io",
  "employees_count": 15,
  "founded_year": 2021
}
```

### Step 2: Aggiungi Competitor 1 - Shopify
```json
{
  "competitor_name": "Shopify",
  "competitor_industry": "SaaS / E-Commerce",
  "main_products": ["E-commerce platform", "Payment processing", "Inventory", "Analytics"],
  "market_position": "leader",
  "threat_level": "high",
  "website": "https://shopify.com"
}
```

**Pricing Shopify**:
- Basic: €29/mese
- Professional: €99/mese
- Advanced: €299/mese

### Step 3: Aggiungi Competitor 2 - WooCommerce
```json
{
  "competitor_name": "WooCommerce",
  "competitor_industry": "E-Commerce / WordPress",
  "main_products": ["E-commerce plugin", "Free platform", "WordPress native"],
  "market_position": "challenger",
  "threat_level": "high",
  "website": "https://woocommerce.com"
}
```

**Pricing WooCommerce**:
- Free: €0 (auto-hosted)
- Hosting: €4-24/mese (dipende provider)

### Step 4: Aggiungi Competitor 3 - BigCommerce
```json
{
  "competitor_name": "BigCommerce",
  "competitor_industry": "SaaS / E-Commerce",
  "main_products": ["Enterprise e-commerce", "Multi-channel", "API-first"],
  "market_position": "challenger",
  "threat_level": "medium",
  "website": "https://bigcommerce.com"
}
```

**Pricing BigCommerce**:
- Standard: €49/mese
- Plus: €115/mese
- Pro: €235/mese

### Step 5: Genera Report

**Expected Output**:
- ✅ **Positioning**: ShopFlow deve posizionarsi come alternativa user-friendly con AI nativa vs Shopify enterprise
- ✅ **Advantages**: AI per ottimizzazione prodotti, pricing più basso, setup più veloce
- ✅ **Weaknesses**: Meno integrazioni, brand awareness limitato, team piccolo
- ✅ **Opportunities**: Gap nel mercato micro-seller (<10 prodotti), trend automazione AI
- ✅ **Pricing**: €39-79/mese per competere con Shopify
- ✅ **Differentiation**: AI nativa per product recommendations, automated pricing

---

## 📋 Test Scenario 2: SaaS Project Management

### Step 1: Registra Azienda
```json
{
  "name": "TaskMaster Pro",
  "industry": "SaaS / Project Management",
  "description": "Piattaforma di project management leggera per team small-medium",
  "target_market": "Team tech 5-50 persone",
  "website": "https://taskmaster.pro",
  "employees_count": 8,
  "founded_year": 2023
}
```

### Step 2: Competitor 1 - Asana
```json
{
  "competitor_name": "Asana",
  "competitor_industry": "SaaS / Project Management",
  "main_products": ["Project management", "Timeline", "Portfolio", "Reporting"],
  "market_position": "leader",
  "threat_level": "high"
}
```

**Pricing**: €11-24.99/utente/mese

### Step 3: Competitor 2 - Monday.com
```json
{
  "competitor_name": "Monday.com",
  "competitor_industry": "SaaS / Work OS",
  "main_products": ["Work OS", "Project management", "CRM", "Automation"],
  "market_position": "leader",
  "threat_level": "high"
}
```

**Pricing**: €9-16/utente/mese

### Step 4: Competitor 3 - Trello
```json
{
  "competitor_name": "Trello",
  "competitor_industry": "SaaS / Task Management",
  "main_products": ["Kanban boards", "Simple task tracking", "Free tier"],
  "market_position": "follower",
  "threat_level": "medium"
}
```

**Pricing**: Free, €9.99/utente/mese pro

### Step 5: Expected Report
- **Gap**: Segmento enterprise open-source (alternativa a competitor chiusi)
- **Opportunity**: User experience semplificata vs Monday.com complesso
- **Pricing**: €7-15/utente/mese (undercutting Asana/Monday)

---

## 🧪 Test API Directly (cURL)

### Test 1: Health Check
```bash
curl http://localhost:3000/api/v1/health
```

**Expected**:
```json
{
  "status": "healthy",
  "database": "connected",
  "kimi_api": "connected"
}
```

### Test 2: Registra Azienda
```bash
curl -X POST http://localhost:3000/api/v1/companies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "TestCorp SRL",
    "industry": "SaaS",
    "description": "Test company for validation",
    "target_market": "SMB",
    "website": "https://test.com",
    "employees_count": 10,
    "founded_year": 2022
  }'
```

**Expected**: Restituisce `company_id`

### Test 3: Aggiungi Competitor
```bash
curl -X POST http://localhost:3000/api/v1/companies/{company_id}/competitors \
  -H "Content-Type: application/json" \
  -d '{
    "competitor_name": "TestCompetitor Inc",
    "competitor_industry": "SaaS",
    "main_products": ["Product A", "Product B"],
    "market_position": "leader",
    "threat_level": "high"
  }'
```

**Expected**: Restituisce `competitor_id`

### Test 4: Aggiungi Prezzo
```bash
curl -X POST http://localhost:3000/api/v1/competitors/{competitor_id}/pricing \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "TestCompetitor Pro",
    "price": 99,
    "currency": "EUR",
    "pricing_model": "subscription",
    "features_included": ["Feature 1", "Feature 2"]
  }'
```

**Expected**: Success response

### Test 5: Genera Report
```bash
curl -X POST http://localhost:3000/api/v1/companies/{company_id}/positioning-report
```

**Expected**: Report generation status

---

## ✅ Validation Checklist

- [ ] Landing page carica correttamente (HTML valido)
- [ ] Frontend React carica su localhost:3001
- [ ] Stepper wizard visibile (Azienda → Competitor → Report)
- [ ] Form registrazione azienda funziona
- [ ] Bottone "Registra Azienda" sottomette dati
- [ ] Step 2 carica dopo registrazione
- [ ] Form competitor funziona
- [ ] Competitor list mostra elementi aggiunti
- [ ] Bottone "Genera Report" funziona
- [ ] Report output mostra dati corretti
- [ ] Badge colorati visibili (verde/rosso/blu/giallo)
- [ ] Loading spinner durante analisi
- [ ] Toast notifications funzionano
- [ ] Export/Print PDF funziona

---

## 🚀 Status

- Backend: ✅ Buildato
- Frontend: ✅ Buildato
- Landing Page: ✅ Creata
- Deployment: ✅ Ready for VPS
- Test Scenarios: ✅ Pronti

**Prossimo Step**: Test su localhost/VPS

---
