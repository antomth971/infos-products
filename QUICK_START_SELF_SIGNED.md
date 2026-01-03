# 🚀 HTTPS immédiat avec certificat auto-signé

**Solution rapide** pour activer HTTPS et faire fonctionner le QR code **MAINTENANT** (5 minutes).

⚠️ **Avertissement de sécurité** : Le navigateur affichera un message "Connexion non sécurisée". C'est normal, il suffit de l'accepter.

---

## 📋 Pourquoi cette solution ?

✅ **Avantages** :
- Fonctionne **immédiatement** (pas besoin de domaine)
- Active HTTPS pour permettre l'accès à la caméra
- Le scanner QR fonctionne !
- Gratuit et simple

⚠️ **Inconvénient** :
- Le navigateur affiche un avertissement qu'il faut accepter
- Pas recommandé pour un site public (OK pour usage personnel/interne)

---

## 🚀 Installation (5 minutes)

### Sur le serveur Contabo :

```bash
ssh root@VOTRE_IP_CONTABO
cd /root/infos_product
```

### 1. Créer le certificat auto-signé

```bash
# Créer le dossier pour les certificats
mkdir -p ssl

# Générer le certificat (valide 365 jours)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/selfsigned.key \
  -out ssl/selfsigned.crt \
  -subj "/C=FR/ST=France/L=Paris/O=MyCompany/CN=VOTRE_IP_CONTABO"
```

Remplacez `VOTRE_IP_CONTABO` par votre IP réelle (ex: `/CN=45.123.45.67`)

### 2. Installer Nginx

```bash
apt-get update
apt-get install -y nginx
```

### 3. Configurer Nginx pour HTTPS

```bash
nano /etc/nginx/sites-available/web-scraper
```

Collez cette configuration :

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name _;

    # Rediriger tout le trafic HTTP vers HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name _;

    # Certificat auto-signé
    ssl_certificate /root/infos_product/ssl/selfsigned.crt;
    ssl_certificate_key /root/infos_product/ssl/selfsigned.key;

    # Configuration SSL basique
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts pour scraping longs
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

Sauvegardez : `Ctrl+X` → `Y` → `Entrée`

### 4. Activer la configuration

```bash
# Créer le lien symbolique
ln -s /etc/nginx/sites-available/web-scraper /etc/nginx/sites-enabled/

# Supprimer la config par défaut
rm -f /etc/nginx/sites-enabled/default

# Vérifier la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

### 5. Ouvrir le port HTTPS dans le pare-feu

```bash
ufw allow 443/tcp
ufw reload
```

---

## ✅ Test

### 1. Ouvrez votre navigateur et allez sur :

```
https://VOTRE_IP_CONTABO
```

### 2. Accepter l'avertissement de sécurité

Le navigateur affichera un message comme :
- Chrome : "Votre connexion n'est pas privée"
- Firefox : "Attention : risque probable de sécurité"
- Safari : "Cette connexion n'est pas privée"

**C'est normal !** Cliquez sur :
- Chrome : "Paramètres avancés" → "Continuer vers [IP] (dangereux)"
- Firefox : "Avancé" → "Accepter le risque et poursuivre"
- Safari : "Afficher les détails" → "Consulter ce site web"

### 3. Testez le scanner QR 📷

Le scanner QR devrait maintenant fonctionner ! ✅

---

## 📱 Sur mobile

Sur votre smartphone, même processus :

1. Allez sur `https://VOTRE_IP_CONTABO`
2. Acceptez l'avertissement
3. Le QR code fonctionne ! 📷

---

## 🔧 Dépannage

### Le site n'est pas accessible

```bash
# Vérifier que Nginx tourne
systemctl status nginx

# Vérifier que l'application tourne
docker-compose ps

# Voir les logs Nginx
tail -f /var/log/nginx/error.log
```

### "Connexion refusée"

```bash
# Vérifier le pare-feu
ufw status

# Ouvrir les ports si nécessaire
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
```

### Le QR code ne fonctionne toujours pas

1. Vérifiez que l'URL commence bien par **https://** (avec le S)
2. Vérifiez que vous avez bien accepté l'avertissement de sécurité
3. Rechargez la page (F5)
4. Vérifiez les logs du navigateur (F12 → Console)

---

## 📝 Commandes utiles

```bash
# Redémarrer Nginx
systemctl restart nginx

# Voir les logs Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Vérifier la configuration Nginx
nginx -t

# Voir les certificats
openssl x509 -in ssl/selfsigned.crt -text -noout
```

---

## 💡 Mise à jour future vers Let's Encrypt

Quand vos problèmes réseau seront résolus, vous pourrez facilement passer à un vrai certificat avec DuckDNS ou FreeDNS. Consultez :
- `QUICK_START_HTTPS.md` (DuckDNS)
- `QUICK_START_FREEDNS.md` (FreeDNS)

---

**C'est tout ! Votre QR code devrait fonctionner maintenant !** 📷✅
