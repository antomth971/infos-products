# Guide de déploiement sur Contabo VPS

Ce guide vous accompagne pas à pas pour déployer votre application sur Contabo VPS.

## Prérequis

- Un compte Contabo (https://contabo.com)
- Un compte MongoDB Atlas (gratuit) pour la base de données
- Git configuré sur votre machine locale
- Carte bancaire pour l'inscription Contabo

---

## ÉTAPE 1: Créer un VPS sur Contabo

### 1.1. Créer un compte Contabo
1. Allez sur https://contabo.com/
2. Cliquez sur "Order" ou "VPS"
3. Créez un compte ou connectez-vous

### 1.2. Commander un VPS

1. Sélectionnez **Cloud VPS M** (recommandé pour votre projet):
   - 4 vCPU Cores
   - 8 GB RAM
   - 200 GB SSD Storage
   - Prix: **5,99€/mois** (facturation mensuelle disponible)
   - Note: Puppeteer nécessite au moins 2 GB de RAM

2. **Configuration du serveur**:
   - **Region**: Europe (Nuremberg, Germany recommandé pour l'Europe)
   - **Image/OS**: Ubuntu 22.04 LTS
   - **Period**: Monthly (mensuel)
   - **Storage Type**: SSD (par défaut)

3. **Options supplémentaires** (optionnelles):
   - Object Storage: Non (pas nécessaire)
   - Backups: Optionnel (recommandé, +20%)

4. **Configuration SSH**:
   - Password: Vous recevrez un mot de passe root par email
   - OU créez une clé SSH (plus sécurisé)

5. **Finalisation**:
   - Vérifiez votre commande
   - Ajoutez vos informations de paiement
   - Validez la commande

### 1.3. Récupérer les accès

**Important**: Contabo met environ 30 minutes à 2 heures pour provisionner votre serveur.

Vous recevrez **2 emails**:
1. **Email de confirmation** de commande
2. **Email avec les accès SSH**:
   - Adresse IP publique
   - Nom d'utilisateur (généralement `root`)
   - Mot de passe temporaire

**Notez ces informations**, vous en aurez besoin.

---

## ÉTAPE 2: Configurer MongoDB Atlas

### 2.1. Créer un compte MongoDB Atlas
1. Allez sur https://www.mongodb.com/cloud/atlas/register
2. Créez un compte gratuit
3. Créez un nouveau cluster (choisissez le plan **FREE M0**)
4. Choisissez une région proche (ex: Frankfurt pour l'Europe)

### 2.2. Configurer l'accès à la base de données

1. **Database Access** (menu de gauche):
   - Cliquez sur "Add New Database User"
   - Créez un utilisateur avec un nom et un mot de passe sécurisé
   - Rôle: "Read and write to any database"
   - **NOTEZ** le nom d'utilisateur et le mot de passe

2. **Network Access** (menu de gauche):
   - Cliquez sur "Add IP Address"
   - Choisissez "Allow Access from Anywhere" (0.0.0.0/0)
   - Ou ajoutez l'IP de votre serveur Contabo pour plus de sécurité

### 2.3. Récupérer l'URL de connexion

1. Cliquez sur "Database" puis "Connect"
2. Choisissez "Connect your application"
3. Sélectionnez "Node.js" et la version 4.1 ou plus
4. **Copiez l'URL de connexion**:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Remplacez `<username>` et `<password>` par vos identifiants
6. Ajoutez le nom de votre base de données après `.net/`:
   ```
   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority
   ```

---

## ÉTAPE 3: Première connexion et configuration du serveur

### 3.1. Se connecter au serveur via SSH

Ouvrez un terminal sur votre machine locale:

```bash
ssh root@VOTRE_IP_CONTABO
```

Remplacez `VOTRE_IP_CONTABO` par l'adresse IP reçue par email.

À la première connexion:
- Tapez `yes` pour accepter l'empreinte du serveur
- Entrez le mot de passe temporaire reçu par email
- **On vous demandera de changer le mot de passe** (choisissez-en un fort)

### 3.2. Mettre à jour le serveur (important!)

```bash
apt-get update && apt-get upgrade -y
```

### 3.3. Télécharger votre projet

Si votre code est sur GitHub/GitLab:

```bash
# Installer Git si nécessaire
apt-get install -y git

# Cloner votre projet
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
cd VOTRE_REPO
```

**OU** si votre code n'est pas encore sur Git, uploadez-le via SCP depuis votre machine locale:

```bash
# Sur votre machine locale (nouveau terminal)
cd /Users/anthonymathieu/Documents/projets/sean_project
scp -r infos_product root@VOTRE_IP_CONTABO:/root/
```

Puis retournez sur le serveur:
```bash
cd /root/infos_product
```

### 3.4. Exécuter le script de configuration

```bash
# Rendre le script exécutable
chmod +x setup-server.sh

# Exécuter le script (créer un utilisateur "deployer" optionnel)
sudo bash setup-server.sh deployer
```

Ce script va:
- Installer Docker et Docker Compose
- Configurer le pare-feu (UFW)
- Installer Git et les outils nécessaires
- Créer un utilisateur "deployer" (optionnel mais recommandé)

**⏱️ Temps d'exécution**: 5-10 minutes

---

## ÉTAPE 4: Configurer votre application

### 4.1. Créer le fichier .env

```bash
nano .env
```

Collez ce contenu (remplacez par vos vraies valeurs):

```env
NODE_ENV=production
PORT=3000

# MongoDB Atlas (URL récupérée à l'étape 2)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority

# Codes d'accès (personnalisez-les!)
ACCESS_CODE=VotreCodeAccesSecurise123
DELETE_CODE=VotreCodeSuppressionSecurise456

# Secret de session (générez une chaîne aléatoire longue)
SESSION_SECRET=changez-moi-par-une-longue-chaine-aleatoire-tres-securisee

# Token Vinted (si vous l'utilisez)
VINTED_ACCESS_TOKEN=your_access_key,your_signing_key

# Configuration Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Sauvegardez avec:
- `Ctrl+X`
- `Y` (oui)
- `Entrée`

**💡 Astuce**: Pour générer un SESSION_SECRET sécurisé:
```bash
openssl rand -base64 32
```

### 4.2. Rendre les scripts exécutables

```bash
chmod +x deploy.sh setup-server.sh
```

---

## ÉTAPE 5: Déployer l'application

### 5.1. Lancer le déploiement

```bash
./deploy.sh
```

Le script va:
1. Vérifier le fichier .env
2. Construire l'image Docker
3. Démarrer l'application
4. Afficher les logs

**⏱️ Temps d'exécution**: 5-15 minutes (première fois, téléchargement des dépendances)

### 5.2. Vérifier que tout fonctionne

Vérifiez les logs en temps réel:

```bash
docker-compose logs -f app
```

Vous devriez voir:
- "✓ Connecté à MongoDB"
- "Serveur démarré sur le port 3000"

Appuyez sur `Ctrl+C` pour quitter.

### 5.3. Tester l'application

Depuis votre machine locale, testez l'accès:

```bash
curl http://VOTRE_IP_CONTABO:3000
```

Ou ouvrez dans votre navigateur:
```
http://VOTRE_IP_CONTABO:3000
```

**✅ Ça marche?** Parfait! Passez à l'étape suivante pour sécuriser avec HTTPS.

---

## ÉTAPE 6: Configurer un domaine et HTTPS (Recommandé)

### 6.1. Pointer votre domaine vers Contabo

Dans votre registrar de domaine (OVH, Gandi, Namecheap, etc.):

1. Créez un enregistrement **A**:
   - Nom: `app` (ou `@` pour le domaine principal)
   - Type: A
   - Valeur: `VOTRE_IP_CONTABO`
   - TTL: 3600 (1 heure)

2. Attendez la propagation DNS (5 minutes à 24h, souvent ~1h)

3. Vérifiez la propagation:
   ```bash
   nslookup app.votredomaine.com
   ```

### 6.2. Installer Nginx et Certbot

Sur le serveur Contabo:

```bash
# Installer Nginx
apt-get install -y nginx

# Installer Certbot pour les certificats SSL gratuits
apt-get install -y certbot python3-certbot-nginx
```

### 6.3. Configurer Nginx

Créez un fichier de configuration:

```bash
nano /etc/nginx/sites-available/web-scraper
```

Collez cette configuration (remplacez `app.votredomaine.com`):

```nginx
server {
    listen 80;
    server_name app.votredomaine.com;

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

        # Augmenter les timeouts pour les scraping longs
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }
}
```

Activez la configuration:

```bash
ln -s /etc/nginx/sites-available/web-scraper /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 6.4. Obtenir un certificat SSL gratuit

```bash
certbot --nginx -d app.votredomaine.com
```

Suivez les instructions:
- Entrez votre email
- Acceptez les conditions
- Certbot configurera automatiquement HTTPS

Le certificat se renouvellera automatiquement tous les 90 jours.

### 6.5. Mettre à jour le pare-feu

```bash
ufw allow 'Nginx Full'
ufw delete allow 3000/tcp  # Fermer l'accès direct au port 3000
ufw reload
```

**🎉 Terminé!** Votre application est accessible sur:
```
https://app.votredomaine.com
```

---

## ÉTAPE 7: Maintenance et commandes utiles

### Voir les logs en temps réel
```bash
docker-compose logs -f app
```

### Redémarrer l'application
```bash
docker-compose restart
```

### Arrêter l'application
```bash
docker-compose down
```

### Mettre à jour l'application

**Sur votre machine locale**:
```bash
git add .
git commit -m "Nouvelles modifications"
git push
```

**Sur le serveur Contabo**:
```bash
cd /root/VOTRE_REPO  # ou /home/deployer/VOTRE_REPO
git pull
./deploy.sh
```

### Surveiller les ressources
```bash
htop          # Utilisation CPU/RAM (Ctrl+C pour quitter)
docker stats  # Stats des conteneurs
df -h         # Espace disque
```

### Nettoyer Docker (libérer de l'espace)
```bash
docker system prune -a --volumes
```

### Sauvegarder la base de données
MongoDB Atlas fait des sauvegardes automatiques avec le plan gratuit.

---

## Coûts estimés

| Service | Prix |
|---------|------|
| **Contabo VPS M** | 5,99€/mois |
| **MongoDB Atlas M0** | Gratuit (512 MB) |
| **Certificat SSL** | Gratuit (Let's Encrypt) |
| **Domaine** | ~10€/an (variable) |

**Total mensuel**: **5,99€/mois** + domaine (~0,83€/mois) = **~6,82€/mois**

---

## Dépannage

### Je ne peux pas me connecter en SSH

**Vérifiez**:
- L'IP est correcte (email de Contabo)
- Le mot de passe (email de Contabo)
- Votre pare-feu local n'bloque pas le port 22

**Solution**: Utilisez le VNC web de Contabo (dans le panel de contrôle)

### L'application ne démarre pas

```bash
docker-compose logs app
```

**Erreurs communes**:
- `.env` manquant ou mal configuré
- `MONGODB_URI` incorrect
- Pas assez de RAM (augmentez votre VPS)

### Erreur de connexion MongoDB

**Vérifiez**:
- L'URL dans `.env` est correcte (username, password, nom de base)
- L'IP du serveur est autorisée dans MongoDB Atlas Network Access
- Internet fonctionne: `ping google.com`

### Le serveur ne répond pas sur le port 3000

```bash
ufw status          # Vérifier que le port 3000 est ouvert
docker-compose ps   # Vérifier que le conteneur tourne
netstat -tulpn | grep 3000  # Vérifier que le port écoute
```

### Erreur "Out of memory" avec Puppeteer

Votre VPS manque de RAM. Solutions:
1. Limitez le nombre de scraping simultanés
2. Ajoutez du swap:
   ```bash
   fallocate -l 2G /swapfile
   chmod 600 /swapfile
   mkswap /swapfile
   swapon /swapfile
   echo '/swapfile none swap sw 0 0' >> /etc/fstab
   ```

### Le site HTTPS ne fonctionne pas

**Vérifiez**:
- Le DNS pointe bien vers votre IP: `nslookup app.votredomaine.com`
- Nginx tourne: `systemctl status nginx`
- Le certificat est valide: `certbot certificates`

**Renouveler manuellement le certificat**:
```bash
certbot renew --dry-run
certbot renew
```

---

## Différences importantes avec Hetzner

| Aspect | Contabo | Hetzner |
|--------|---------|---------|
| **Provisioning** | 30 min - 2h | Instantané |
| **Panel web** | Basique | Moderne et intuitif |
| **Support** | Email (quelques heures) | Ticket (rapide) |
| **Prix VPS 4GB** | 5,99€/mois | ~8,21€/mois |
| **Réseau** | 200 Mbit/s | 20 Gbit/s |
| **Backups** | Payant (+20%) | Payant |

**✅ Avantage Contabo**: Prix le plus bas du marché
**⚠️ Inconvénient**: Moins de features, support plus lent

---

## Support et documentation

- **Contabo**: https://contabo.com/en/support/
- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Docker**: https://docs.docker.com/
- **Certbot**: https://certbot.eff.org/

---

## Checklist de déploiement

- [ ] Compte Contabo créé
- [ ] VPS commandé (Cloud VPS M minimum)
- [ ] Accès SSH reçu par email
- [ ] Compte MongoDB Atlas créé
- [ ] Base de données MongoDB configurée
- [ ] Connexion SSH au serveur réussie
- [ ] Mot de passe root changé
- [ ] Script `setup-server.sh` exécuté
- [ ] Code cloné/uploadé sur le serveur
- [ ] Fichier `.env` créé et configuré
- [ ] `deploy.sh` exécuté avec succès
- [ ] Application accessible sur `http://IP:3000`
- [ ] Domaine configuré (optionnel)
- [ ] Nginx installé et configuré (optionnel)
- [ ] Certificat SSL obtenu (optionnel)
- [ ] Application accessible en HTTPS (optionnel)

---

**Félicitations !** 🎉 Votre application est maintenant en production sur Contabo !

**Prochaines étapes recommandées**:
1. Configurez des backups automatiques
2. Configurez un monitoring (Uptime Robot gratuit)
3. Ajoutez des alertes (Discord/Email si le serveur tombe)
4. Documentez vos codes d'accès dans un gestionnaire de mots de passe
