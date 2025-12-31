#!/bin/bash

# Script d'attente et obtention du certificat SSL
# Usage: ./wait-and-ssl.sh web-scrapper.duckdns.org anthonymathieu21@live.fr

DOMAIN="$1"
EMAIL="$2"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: ./wait-and-ssl.sh votre-domaine.duckdns.org votre@email.com"
    exit 1
fi

echo "================================================"
echo "⏳ Attente de la propagation DNS"
echo "================================================"
echo ""
echo "Domaine : $DOMAIN"
echo "Email   : $EMAIL"
echo ""

# Fonction pour tester le DNS
check_dns() {
    if nslookup "$DOMAIN" 8.8.8.8 2>/dev/null | grep -q "Address:"; then
        return 0
    else
        return 1
    fi
}

# Attendre que le DNS se propage
MAX_ATTEMPTS=40  # 40 tentatives = 20 minutes max
ATTEMPT=0
WAIT_TIME=30  # 30 secondes entre chaque tentative

echo "🔍 Vérification du DNS toutes les 30 secondes..."
echo "⏱️  Temps maximum d'attente : 20 minutes"
echo ""

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    ELAPSED=$((ATTEMPT * WAIT_TIME / 60))

    echo -n "[$ATTEMPT/$MAX_ATTEMPTS] (${ELAPSED} min) Test du DNS... "

    if check_dns; then
        echo "✅ DNS OK !"
        echo ""
        echo "🎉 Le DNS est maintenant propagé !"
        break
    else
        echo "❌ Pas encore"

        if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
            echo "    ⏳ Attente de 30 secondes..."
            sleep $WAIT_TIME
        fi
    fi
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo ""
    echo "⚠️  Le DNS ne s'est pas propagé après 20 minutes"
    echo ""
    echo "Vérifications à faire :"
    echo "1. Connectez-vous sur https://www.duckdns.org/"
    echo "2. Vérifiez que votre domaine '$DOMAIN' est bien listé"
    echo "3. Vérifiez que l'IP affichée correspond à votre serveur"
    echo "4. Exécutez : ~/duckdns/duck.sh && cat ~/duckdns/duck.log"
    echo ""
    exit 1
fi

# Le DNS fonctionne, obtenir le certificat SSL
echo "================================================"
echo "🔒 Obtention du certificat SSL"
echo "================================================"
echo ""

# Arrêter Nginx pour libérer le port 80
echo "⏸️  Arrêt temporaire de Nginx..."
systemctl stop nginx

# Obtenir le certificat
echo "📝 Demande de certificat à Let's Encrypt..."
echo ""

if certbot certonly --standalone \
    -d "$DOMAIN" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL"; then

    echo ""
    echo "✅ Certificat SSL obtenu avec succès !"
    echo ""

    # Configurer Nginx avec HTTPS
    echo "⚙️  Configuration de Nginx pour HTTPS..."

    cat > /etc/nginx/sites-available/web-scraper << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;

    # Configuration SSL moderne
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

    # Tester et démarrer Nginx
    echo "🧪 Test de la configuration Nginx..."
    if nginx -t 2>/dev/null; then
        echo "✅ Configuration valide"
        systemctl start nginx

        # Ouvrir le port HTTPS
        ufw allow 443/tcp >/dev/null 2>&1
        ufw reload >/dev/null 2>&1

        echo ""
        echo "================================================"
        echo "✅ Installation terminée avec succès !"
        echo "================================================"
        echo ""
        echo "🌐 Votre site est maintenant accessible en HTTPS :"
        echo "   👉 https://$DOMAIN"
        echo ""
        echo "📷 Le scanner QR fonctionne maintenant !"
        echo ""
        echo "📋 Informations :"
        echo "   - Certificat valide pendant 90 jours"
        echo "   - Renouvellement automatique configuré"
        echo ""
        echo "🧪 Test rapide :"
        sleep 3
        if curl -skI "https://$DOMAIN" | grep -q "HTTP"; then
            echo "   ✅ Site accessible en HTTPS"
        else
            echo "   ⏳ Attendez quelques secondes puis testez"
        fi
        echo ""

    else
        echo "❌ Erreur dans la configuration Nginx"
        systemctl start nginx
        exit 1
    fi

else
    echo ""
    echo "❌ Erreur lors de l'obtention du certificat"
    echo ""
    echo "Logs détaillés :"
    tail -20 /var/log/letsencrypt/letsencrypt.log
    echo ""
    systemctl start nginx
    exit 1
fi
