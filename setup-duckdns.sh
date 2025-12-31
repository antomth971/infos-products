#!/bin/bash

# Script d'installation automatique HTTPS avec DuckDNS
# Usage: ./setup-duckdns.sh

set -e  # Arrêter en cas d'erreur

echo "================================================"
echo "🦆 Configuration HTTPS avec DuckDNS"
echo "================================================"
echo ""

# Vérifier qu'on est root
if [ "$EUID" -ne 0 ]; then
    echo "❌ Ce script doit être exécuté en tant que root"
    echo "   Utilisez: sudo ./setup-duckdns.sh"
    exit 1
fi

# Demander les informations
echo "📝 Informations nécessaires :"
echo ""
read -p "Votre sous-domaine DuckDNS (sans .duckdns.org, ex: monapp) : " DUCKDNS_DOMAIN
read -p "Votre token DuckDNS : " DUCKDNS_TOKEN
read -p "Votre email (pour Let's Encrypt) : " EMAIL

# Validation
if [ -z "$DUCKDNS_DOMAIN" ] || [ -z "$DUCKDNS_TOKEN" ] || [ -z "$EMAIL" ]; then
    echo "❌ Tous les champs sont obligatoires"
    exit 1
fi

FULL_DOMAIN="${DUCKDNS_DOMAIN}.duckdns.org"

echo ""
echo "📋 Récapitulatif :"
echo "   - Domaine : $FULL_DOMAIN"
echo "   - Email : $EMAIL"
echo ""
read -p "Continuer ? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Installation annulée"
    exit 1
fi

echo ""
echo "🚀 Démarrage de l'installation..."
echo ""

# Étape 1 : Mettre à jour le système
echo "📦 [1/7] Mise à jour du système..."
apt-get update -qq > /dev/null 2>&1

# Étape 2 : Installer DuckDNS
echo "🦆 [2/7] Installation de DuckDNS..."
mkdir -p ~/duckdns
cd ~/duckdns

cat > duck.sh << EOF
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" | curl -k -s -o ~/duckdns/duck.log -K -
EOF

chmod +x duck.sh

# Tester DuckDNS
./duck.sh
RESULT=$(cat duck.log)
if [ "$RESULT" != "OK" ]; then
    echo "❌ Erreur DuckDNS : $RESULT"
    echo "   Vérifiez votre domaine et token"
    exit 1
fi
echo "   ✅ DuckDNS configuré : $FULL_DOMAIN"

# Étape 3 : Configurer le cron
echo "⏰ [3/7] Configuration du cron..."
(crontab -l 2>/dev/null | grep -v duckdns; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
echo "   ✅ Mise à jour automatique activée (toutes les 5 min)"

# Étape 4 : Installer Nginx
echo "🌐 [4/7] Installation de Nginx..."
apt-get install -y nginx -qq > /dev/null 2>&1
echo "   ✅ Nginx installé"

# Étape 5 : Configurer Nginx
echo "⚙️  [5/7] Configuration de Nginx..."
cat > /etc/nginx/sites-available/web-scraper << EOF
server {
    listen 80;
    server_name ${FULL_DOMAIN};

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # Timeouts pour les scraping longs
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
EOF

# Activer le site
ln -sf /etc/nginx/sites-available/web-scraper /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t > /dev/null 2>&1
systemctl restart nginx
echo "   ✅ Nginx configuré"

# Étape 6 : Installer Certbot et obtenir le certificat SSL
echo "🔒 [6/7] Installation de Certbot et obtention du certificat SSL..."
apt-get install -y certbot python3-certbot-nginx -qq > /dev/null 2>&1

# Attendre un peu pour que le DNS se propage
echo "   ⏳ Attente de la propagation DNS (30 secondes)..."
sleep 30

# Obtenir le certificat
certbot --nginx -d "$FULL_DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --redirect \
    --quiet

if [ $? -eq 0 ]; then
    echo "   ✅ Certificat SSL obtenu et configuré"
else
    echo "   ⚠️  Erreur lors de l'obtention du certificat SSL"
    echo "   Vous pouvez réessayer avec : certbot --nginx -d $FULL_DOMAIN"
fi

# Étape 7 : Configurer le pare-feu
echo "🔥 [7/7] Configuration du pare-feu..."
ufw --force enable > /dev/null 2>&1
ufw allow 'Nginx Full' > /dev/null 2>&1
ufw delete allow 3000/tcp > /dev/null 2>&1 || true
ufw reload > /dev/null 2>&1
echo "   ✅ Pare-feu configuré (ports 80 et 443 ouverts)"

# Vérifications finales
echo ""
echo "🧪 Vérifications finales..."

# Vérifier que l'application tourne
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Application accessible sur le port 3000"
else
    echo "   ⚠️  L'application ne répond pas sur le port 3000"
    echo "      Lancez : docker-compose up -d"
fi

# Vérifier Nginx
if systemctl is-active --quiet nginx; then
    echo "   ✅ Nginx actif"
else
    echo "   ❌ Nginx non actif"
fi

# Vérifier le certificat
if certbot certificates 2>/dev/null | grep -q "$FULL_DOMAIN"; then
    echo "   ✅ Certificat SSL configuré"
else
    echo "   ⚠️  Certificat SSL non trouvé"
fi

echo ""
echo "================================================"
echo "✅ Installation terminée !"
echo "================================================"
echo ""
echo "🌐 Votre application est accessible sur :"
echo "   👉 https://$FULL_DOMAIN"
echo ""
echo "📷 Le scanner QR fonctionne maintenant en HTTPS !"
echo ""
echo "📝 Informations utiles :"
echo "   - Certificat SSL : Renouvellement automatique tous les 90 jours"
echo "   - DuckDNS : Mise à jour automatique toutes les 5 minutes"
echo "   - Logs Nginx : tail -f /var/log/nginx/error.log"
echo "   - Logs App : docker-compose logs -f"
echo ""
echo "🔧 Commandes utiles :"
echo "   - Tester le certificat : certbot renew --dry-run"
echo "   - Recharger Nginx : systemctl reload nginx"
echo "   - Redémarrer l'app : docker-compose restart"
echo ""
echo "💡 Si le site n'est pas accessible, attendez 5 minutes"
echo "   que le DNS se propage complètement."
echo ""
echo "🎉 Bon développement !"
echo ""
