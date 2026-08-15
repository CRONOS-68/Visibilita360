# 🚀 Deployment VPS - Visibilita360

Guida completa per deployare su VPS (AWS, DigitalOcean, Hetzner, etc.)

---

## 📋 Prerequisiti VPS

### Sistema Operativo
- Ubuntu 20.04+ o Debian 11+
- Root o sudo access
- Almeno 2GB RAM, 1 vCPU

### Software Richiesto
```bash
# SSH nella tua VPS
ssh root@YOUR_VPS_IP

# Aggiorna sistema
apt update && apt upgrade -y

# Installa dipendenze
apt install -y curl wget git build-essential nodejs npm postgresql postgresql-contrib nginx
```

---

## 🛠️ Setup Manuale Passo-Passo

### 1️⃣ Clone Repo

```bash
cd /opt
git clone https://github.com/CRONOS-68/Visibilita360.git
cd Visibilita360
git checkout claude/support-agent-product-ew8fg9
```

### 2️⃣ Setup Backend

```bash
# Installa dipendenze
npm install

# Crea .env
cat > .env << 'EOF'
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-sonnet-5

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/visibilita360
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=visibilita360

PORT=3000
NODE_ENV=production
EOF

# Build backend
npm run build
```

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install
npm run build
cd ..
```

### 4️⃣ Setup Database

```bash
# Crea database
sudo -u postgres createdb visibilita360

# Test connessione
PGPASSWORD=postgres psql -h localhost -U postgres -d visibilita360 -c "SELECT NOW();"
```

### 5️⃣ Setup Systemd Service

```bash
sudo tee /etc/systemd/system/visibilita360.service > /dev/null << 'EOF'
[Unit]
Description=Visibilita360 Market Positioning API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/Visibilita360
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node /opt/Visibilita360/dist/index.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Abilita e avvia
sudo systemctl daemon-reload
sudo systemctl enable visibilita360
sudo systemctl start visibilita360

# Controlla status
sudo systemctl status visibilita360
```

### 6️⃣ Setup Nginx

```bash
sudo tee /etc/nginx/sites-available/visibilita360 > /dev/null << 'EOF'
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80 default_server;
    server_name _;
    
    client_max_body_size 10M;

    # Landing Page
    location = / {
        root /opt/Visibilita360/public;
        try_files /index.html =404;
    }

    location ~* ^/assets/ {
        root /opt/Visibilita360/public;
        expires 30d;
    }

    # React App
    location /app {
        alias /opt/Visibilita360/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Fallback landing page
    location ~ ^/(?!api|app) {
        root /opt/Visibilita360/public;
        try_files $uri /index.html;
    }
}
EOF

# Disabilita default site
sudo rm -f /etc/nginx/sites-enabled/default

# Abilita il nostro sito
sudo ln -sf /etc/nginx/sites-available/visibilita360 /etc/nginx/sites-enabled/

# Test configurazione
sudo nginx -t

# Ricarica Nginx
sudo systemctl reload nginx
```

---

## 🔐 SSL con Let's Encrypt

```bash
# Installa Certbot
apt install -y certbot python3-certbot-nginx

# Ottieni certificato (usa il tuo dominio)
sudo certbot certonly --nginx -d visibilita360.com -d www.visibilita360.com

# Auto-renew
sudo systemctl enable certbot.timer
```

---

## 📊 Testing

### Test Backend
```bash
curl http://YOUR_VPS_IP/api/v1/health
# Dovrebbe rispondere: {"status":"healthy",...}
```

### Test Landing Page
```bash
curl http://YOUR_VPS_IP/
# Dovrebbe restituire HTML della landing page
```

### Test App
```bash
curl http://YOUR_VPS_IP/app
# Dovrebbe restituire l'app React
```

---

## 📋 Checklist Deploy

- [ ] VPS creato e SSH access verificato
- [ ] Sistema aggiornato (apt update/upgrade)
- [ ] Node.js, npm, PostgreSQL, nginx installati
- [ ] Repo clonato su `/opt/Visibilita360`
- [ ] Backend installato e buildato (`npm install && npm run build`)
- [ ] Frontend installato e buildato (`cd frontend && npm install && npm run build`)
- [ ] Database creato (`createdb visibilita360`)
- [ ] .env configurato con API keys
- [ ] Systemd service creato e avviato
- [ ] Nginx configurato e ricaricato
- [ ] Firewall aperto (porte 80, 443)
- [ ] Dominio puntato a VPS (opzionale)
- [ ] SSL certificate configurato (opzionale)
- [ ] Test API, landing page, app
- [ ] Logs controllati (`sudo journalctl -u visibilita360 -f`)

---

## 🔍 Troubleshooting

### Backend non parte
```bash
# Vedi i log
sudo journalctl -u visibilita360 -f

# Controlla processo
ps aux | grep node

# Controlla porta
netstat -tlnp | grep 3000
```

### Database non connette
```bash
# Test connessione PostgreSQL
PGPASSWORD=postgres psql -h localhost -U postgres -d visibilita360

# Crea database se non esiste
sudo -u postgres createdb visibilita360
```

### Nginx errori
```bash
# Controlla configurazione
sudo nginx -t

# Vedi error log
sudo tail -f /var/log/nginx/error.log
```

### Riavvia tutto
```bash
sudo systemctl restart postgresql
sudo systemctl restart visibilita360
sudo systemctl restart nginx
```

---

## 📈 Performance

### Database Backups
```bash
# Backup settimanale
sudo -u postgres pg_dump visibilita360 > /backups/visibilita360_$(date +%Y%m%d).sql
```

### Monitoring
```bash
# Disk usage
df -h

# Memory usage
free -h

# Service status
sudo systemctl status visibilita360
```

### Logs
```bash
# Applicazione
sudo journalctl -u visibilita360 -f

# Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🌐 URL Finali

Dopo il deploy, accedi a:

- **Landing Page**: `http://YOUR_VPS_IP/`
- **App**: `http://YOUR_VPS_IP/app`
- **API Health**: `http://YOUR_VPS_IP/api/v1/health`

---

## 📞 Support

Se hai problemi:
1. Controlla i log: `sudo journalctl -u visibilita360 -f`
2. Verifica configurazione: `nginx -t`
3. Controlla porte: `netstat -tlnp`
4. Vedi README.md per API docs

---

**Status**: Ready for Production 🚀
