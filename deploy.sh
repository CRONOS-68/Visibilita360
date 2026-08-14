#!/bin/bash

# Visibilita360 - VPS Deployment Script
# Usage: ./deploy.sh <VPS_IP> <VPS_USER>

set -e

VPS_IP=$1
VPS_USER=${2:-root}
VPS_DIR="/opt/visibilita360"

if [ -z "$VPS_IP" ]; then
    echo "Usage: ./deploy.sh <VPS_IP> [VPS_USER]"
    echo "Example: ./deploy.sh 192.168.1.100 ubuntu"
    exit 1
fi

echo "🚀 Deploying Visibilita360 to VPS..."
echo "VPS: $VPS_IP | User: $VPS_USER | Dir: $VPS_DIR"

# 1. Copy files to VPS
echo "📦 Uploading files to VPS..."
ssh $VPS_USER@$VPS_IP "mkdir -p $VPS_DIR"
scp -r src/ frontend/ package.json tsconfig.json .env.example deploy-vps.sh $VPS_USER@$VPS_IP:$VPS_DIR/

# 2. Setup on VPS
echo "⚙️  Setting up backend..."
ssh $VPS_USER@$VPS_IP "cd $VPS_DIR && npm install"

echo "⚙️  Setting up frontend..."
ssh $VPS_USER@$VPS_IP "cd $VPS_DIR/frontend && npm install && npm run build"

# 3. Copy public assets
echo "📂 Copying landing page..."
ssh $VPS_USER@$VPS_IP "mkdir -p $VPS_DIR/public && cd $VPS_DIR && cp public/index.html public/ 2>/dev/null || true"

# 4. Setup systemd service
echo "🔧 Setting up systemd service..."
ssh $VPS_USER@$VPS_IP "cat > /tmp/visibilita360.service << 'EOF'
[Unit]
Description=Visibilita360 API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$VPS_DIR
Environment=\"NODE_ENV=production\"
ExecStart=/usr/bin/node /opt/visibilita360/dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
sudo mv /tmp/visibilita360.service /etc/systemd/system/"

# 5. Setup Nginx
echo "🌐 Setting up Nginx..."
ssh $VPS_USER@$VPS_IP "cat > /tmp/visibilita360.nginx << 'EOF'
upstream backend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 10M;

    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /app {
        alias $VPS_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location / {
        root $VPS_DIR/public;
        try_files \$uri /index.html;
    }
}
EOF
sudo mv /tmp/visibilita360.nginx /etc/nginx/sites-available/visibilita360
sudo ln -sf /etc/nginx/sites-available/visibilita360 /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx"

# 6. Start service
echo "🚀 Starting services..."
ssh $VPS_USER@$VPS_IP "sudo systemctl daemon-reload && sudo systemctl enable visibilita360 && sudo systemctl restart visibilita360"

# 7. Wait for service
echo "⏳ Waiting for service to start..."
sleep 3

# 8. Test
echo "🧪 Testing deployment..."
HEALTH=$(ssh $VPS_USER@$VPS_IP "curl -s http://localhost:3000/api/v1/health")
if echo $HEALTH | grep -q "healthy\|database"; then
    echo "✅ Backend is running!"
else
    echo "⚠️  Backend might need database setup"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Access your app:"
echo "   Landing Page: http://$VPS_IP/"
echo "   App: http://$VPS_IP/app"
echo "   API Health: http://$VPS_IP/api/v1/health"
echo ""
echo "📝 Next steps:"
echo "   1. SSH to VPS: ssh $VPS_USER@$VPS_IP"
echo "   2. Setup database: cd $VPS_DIR && createdb visibilita360"
echo "   3. Configure .env: nano $VPS_DIR/.env"
echo "   4. Restart: sudo systemctl restart visibilita360"
echo ""
echo "📊 Check logs: sudo journalctl -u visibilita360 -f"
