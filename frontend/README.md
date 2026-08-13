# Visibilita360 - Frontend UI

React + TypeScript + Tailwind CSS interface per il Market Positioning Analyzer.

## Caratteristiche

✨ **Design moderno e professionale**
- Gradient header blu
- Stepper wizard intuitivo
- Badge colorati per status
- Animazioni smooth
- Responsive mobile-first

📊 **Funzionalità completa**
- Registrazione azienda
- Gestione competitor (add/remove)
- Generazione report AI
- Visualizzazione risultati
- Export/Stampa PDF

🎨 **UI Components**
- Header con branding
- Stepper progress
- Form validation
- Loading spinners
- Toast notifications
- Responsive cards

## Setup

```bash
# Installa dipendenze
npm install

# Avvia dev server (porta 3001)
npm run dev

# Build per produzione
npm run build
```

## Architettura

```
src/
├── components/
│   ├── Header.tsx
│   ├── Stepper.tsx
│   ├── LoadingSpinner.tsx
│   └── Toast.tsx
├── services/
│   └── api.ts
├── App.tsx
├── main.tsx
└── index.css
```

## API Integration

Comunica con backend su `/api/v1`:
- POST `/companies` - Registra azienda
- POST `/companies/{id}/competitors` - Aggiungi competitor
- POST `/companies/{id}/positioning-report` - Genera report

## Styling

- **Tailwind CSS** per styling rapido
- **Lucide React** per icone
- **Custom color palette**:
  - Primary: #2563eb (blu)
  - Success: #10b981 (verde)
  - Warning: #f59e0b (arancio)
  - Danger: #ef4444 (rosso)

## Browser Support

- Chrome/Edge latest
- Firefox latest
- Safari latest
- Mobile browsers

## Deployment

```bash
npm run build
# Deploy dist/ folder
```

Build optimizzato: ~150KB gzip

---

**Parte di Visibilita360 - Market Positioning Module**
