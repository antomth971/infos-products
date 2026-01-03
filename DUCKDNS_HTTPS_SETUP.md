d# 🦆 Configuration HTTPS gratuite avec DuckDNS

Ce guide vous permet d'obtenir **HTTPS gratuitement** pour votre application, sans acheter de nom de domaine.

## 📋 Ce que vous allez obtenir

- ✅ Un sous-domaine gratuit : `votrenom.duckdns.org`
- ✅ Certificat SSL valide (Let's Encrypt)
- ✅ HTTPS automatique
- ✅ Scanner QR fonctionnel
- ✅ **100% GRATUIT**

---

## 🚀 Installation automatique (Recommandé)

### Étape 1 : Créer votre compte DuckDNS

1. Allez sur **https://www.duckdns.org/**
2. Connectez-vous avec :
   - Google
   - GitHub
   - Reddit
   - Twitter
   (Choisissez celui que vous préférez, c'est juste pour l'authentification)

3. Une fois connecté, vous verrez :
   - Votre **token** (une longue chaîne de caractères)
   - Un champ pour créer un sous-domaine

4. **Créez votre sous-domaine** :
   - Entrez un nom (ex: `monapp`, `scraper`, `vevor`, etc.)
   - Cliquez sur "add domain"
   - Votre domaine sera : `votrenom.duckdns.org`

5. **IMPORTANT : Notez ces 2 informations** :
   - 📝 **Votre sous-domaine** : `votrenom.duckdns.org`
   - 🔑 **Votre token** : (la longue chaîne affichée en haut)

---

### Étape 2 : Lancer le script d'installation

**Sur votre machine locale**, depuis le dossier du projet :

```bash
# Copier le script sur le serveur
scp setup-duckdns.sh root@VOTRE_IP_CONTABO:/root/infos_product/

# Se connecter au serveur
ssh root@VOTRE_IP_CONTABO

# Aller dans le dossier du projet
cd /root/infos_product

# Rendre le script exécutable
chmod +x setup-duckdns.sh

# Lancer le script
./setup-duckdns.sh
```

Le script vous demandera :
1. Votre sous-domaine DuckDNS (ex: `monapp` sans le .duckdns.org)
2. Votre token DuckDNS
3. Votre email (pour Let's Encrypt)

**⏱️ Temps d'installation : 5-10 minutes**

---

### Étape 3 : Vérifier que tout fonctionne

Une fois le script terminé :

1. **Testez votre domaine** :
   ```bash
   curl https://votrenom.duckdns.org
   ```

2. **Ouvrez dans votre navigateur** :
   ```
   https://votrenom.duckdns.org
   ```

3. **Testez le scanner QR** :
   - Allez sur votre site
   - Cliquez sur "📷 Scanner un QR Code"
   - ✅ Il devrait fonctionner sans erreur !

---

## 🔧 Installation manuelle (si vous préférez)

Si vous voulez comprendre chaque étape ou si le script automatique ne fonctionne pas :

### 1. Installer DuckDNS

```bash
# Créer le dossier
mkdir -p ~/duckdns
cd ~/duckdns

# Créer le script de mise à jour
cat > duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=VOTRE_DOMAINE&token=VOTRE_TOKEN&ip=" | curl -k -s -o ~/duckdns/duck.log -K -
EOF

# Remplacez VOTRE_DOMAINE et VOTRE_TOKEN par vos vraies valeurs
nano duck.sh

# Rendre exécutable
chmod +x duck.sh

# Tester (devrait afficher "OK")
./duck.sh
cat duck.log
```

### 2. Automatiser la mise à jour

```bash
# Ajouter au cron (mise à jour toutes les 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -

# Vérifier
crontab -l
```

### 3. Installer Nginx

```bash
apt-get update
apt-get install -y nginx
```

### 4. Configurer Nginx

```bash
cat > /etc/nginx/sites-available/web-scraper << 'EOF'
server {
    listen 80;
    server_name VOTRE_DOMAINE.duckdns.org;

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

        # Timeouts pour les scraping longs
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
EOF

# Remplacez VOTRE_DOMAINE
nano /etc/nginx/sites-available/web-scraper

# Activer le site
ln -sf /etc/nginx/sites-available/web-scraper /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
nginx -t

# Redémarrer Nginx
systemctl restart nginx
```

### 5. Installer Certbot et obtenir le certificat SSL

```bash
# Installer Certbot
apt-get install -y certbot python3-certbot-nginx

# Obtenir le certificat SSL (remplacez par votre domaine)
certbot --nginx -d votre-domaine.duckdns.org --non-interactive --agree-tos --email votre@email.com

# Le certificat se renouvellera automatiquement
```

### 6. Configurer le pare-feu

```bash
# Autoriser HTTPS
ufw allow 'Nginx Full'

# Si le port 3000 était ouvert, le fermer (plus besoin)
ufw delete allow 3000/tcp

# Recharger
ufw reload

# Vérifier
ufw status
```

---

## 🧪 Tests et vérifications

### Vérifier que DuckDNS fonctionne

```bash
# Tester la résolution DNS
nslookup votrenom.duckdns.org

# Devrait afficher l'IP de votre serveur Contabo
```

### Vérifier que Nginx fonctionne

```bash
systemctl status nginx

# Devrait afficher "active (running)"
```

### Vérifier le certificat SSL

```bash
certbot certificates

# Devrait afficher votre certificat avec une date d'expiration dans 90 jours
```

### Tester le site

```bash
# Test HTTP (devrait rediriger vers HTTPS)
curl -I http://votrenom.duckdns.org

# Test HTTPS (devrait retourner votre site)
curl https://votrenom.duckdns.org
```

---

## 🔄 Maintenance

### Renouvellement du certificat SSL

Le certificat se renouvelle **automatiquement** tous les 90 jours.

Pour tester le renouvellement :
```bash
certbot renew --dry-run
```

Pour forcer le renouvellement :
```bash
certbot renew
systemctl reload nginx
```

### Si votre IP change

DuckDNS se met à jour automatiquement toutes les 5 minutes grâce au cron.

Pour forcer une mise à jour immédiate :
```bash
~/duckdns/duck.sh
cat ~/duckdns/duck.log  # Devrait afficher "OK"
```

---

## ❓ Dépannage

### Le site n'est pas accessible

```bash
# Vérifier que Docker tourne
docker-compose ps

# Vérifier que Nginx tourne
systemctl status nginx

# Vérifier que le port 3000 répond localement
curl http://localhost:3000

# Vérifier les logs Nginx
tail -f /var/log/nginx/error.log
```

### "Impossible d'accéder à la caméra"

Vérifiez que vous êtes bien en **HTTPS** :
- URL doit commencer par `https://`
- Cadenas vert dans la barre d'adresse
- Certificat valide (pas d'avertissement)

### Le DNS ne résout pas

```bash
# Vérifier que DuckDNS est à jour
~/duckdns/duck.sh
cat ~/duckdns/duck.log  # Doit afficher "OK"

# Vérifier votre IP publique
curl ifconfig.me

# Elle doit correspondre à celle configurée sur DuckDNS
```

### Erreur de certificat

```bash
# Relancer Certbot
certbot --nginx -d votrenom.duckdns.org --force-renewal

# Recharger Nginx
systemctl reload nginx
```

---

## 📝 Commandes utiles

### Voir les logs Nginx
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Recharger la configuration Nginx
```bash
nginx -t  # Tester d'abord
systemctl reload nginx
```

### Voir l'état du cron DuckDNS
```bash
crontab -l
cat ~/duckdns/duck.log
```

### Redémarrer tout
```bash
systemctl restart nginx
docker-compose restart
```

---

## 🎉 C'est terminé !

Votre application est maintenant accessible en **HTTPS** gratuitement sur :

```
https://votrenom.duckdns.org
```

Le scanner QR fonctionne maintenant parfaitement ! 📷✅

---

## 💡 Prochaines étapes (optionnel)

1. **Monitoring** : Configurez Uptime Robot (gratuit) pour surveiller votre site
2. **Backups** : Sauvegardez régulièrement votre base MongoDB Atlas
3. **Sécurité** : Changez vos codes d'accès dans le fichier `.env`

---

**Besoin d'aide ?** Consultez :
- DuckDNS : https://www.duckdns.org/
- Let's Encrypt : https://letsencrypt.org/
- Certbot : https://certbot.eff.org/
