# Guide de déploiement sur Hetzner Cloud

Ce guide vous accompagne pas à pas pour déployer votre application sur Hetzner Cloud.

## Prérequis

- Un compte Hetzner Cloud (https://www.hetzner.com/cloud)
- Un compte MongoDB Atlas (gratuit) pour la base de données
- Git configuré sur votre machine locale

---

## ÉTAPE 1: Créer un serveur sur Hetzner Cloud

### 1.1. Créer un compte Hetzner
1. Allez sur https://www.hetzner.com/cloud
2. Créez un compte ou connectez-vous
3. Ajoutez un moyen de paiement (carte bancaire)

### 1.2. Créer un nouveau projet
1. Dans le panneau Hetzner Cloud, cliquez sur "New Project"
2. Donnez-lui un nom (ex: "web-scraper")

### 1.3. Créer un serveur (VPS)
1. Cliquez sur "Add Server"
2. Choisissez une localisation (ex: Nuremberg pour l'Europe)
3. **Image**: Ubuntu 22.04 (ou la version LTS la plus récente)
4. **Type**:
   - Pour débuter: **CPX11** (2 vCPU, 2 GB RAM, 40 GB SSD) ~€4.51/mois
   - Recommandé: **CPX21** (3 vCPU, 4 GB RAM, 80 GB SSD) ~€8.21/mois
   - Note: Puppeteer nécessite au moins 2 GB de RAM
5. **Networking**: Laissez les options par défaut (IPv4 + IPv6)
6. **SSH Keys**:
   - Si vous en avez déjà une: sélectionnez-la
   - Sinon: cliquez sur "New SSH Key" et suivez les instructions
7. **Volumes**: Pas nécessaire pour le moment
8. **Firewall**: Nous le configurerons plus tard
9. Donnez un nom à votre serveur (ex: "web-scraper-prod")
10. Cliquez sur "Create & Buy Now"

### 1.4. Récupérer l'adresse IP
1. Une fois le serveur créé (environ 1 minute), notez son **adresse IP publique**
2. Vous la trouverez dans la liste de vos serveurs

---

## ÉTAPE 2: Configurer MongoDB Atlas

### 2.1. Créer un compte MongoDB Atlas
1. Allez sur https://www.mongodb.com/cloud/atlas/register
2. Créez un compte gratuit
3. Créez un nouveau cluster (choisissez le plan **FREE M0**)
4. Choisissez une région proche de votre serveur Hetzner (ex: Frankfurt pour l'Europe)

### 2.2. Configurer l'accès à la base de données
1. **Database Access** (menu de gauche):
   - Cliquez sur "Add New Database User"
   - Créez un utilisateur avec un nom et un mot de passe sécurisé
   - Rôle: "Read and write to any database"
   - **NOTEZ** le nom d'utilisateur et le mot de passe (vous en aurez besoin)

2. **Network Access** (menu de gauche):
   - Cliquez sur "Add IP Address"
   - Choisissez "Allow Access from Anywhere" (0.0.0.0/0)
   - Ou ajoutez l'IP de votre serveur Hetzner pour plus de sécurité

### 2.3. Récupérer l'URL de connexion
1. Cliquez sur "Database" puis "Connect"
2. Choisissez "Connect your application"
3. Sélectionnez "Node.js" et la version 4.1 ou plus
4. **Copiez l'URL de connexion** (elle ressemble à ça):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Remplacez `<username>` et `<password>` par vos identifiants
6. Ajoutez le nom de votre base de données après `.net/`:
   ```
   mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority
   ```

---

## ÉTAPE 3: Configuration initiale du serveur Hetzner

### 3.1. Se connecter au serveur via SSH
Ouvrez un terminal sur votre machine locale et connectez-vous:

```bash
ssh root@VOTRE_IP_HETZNER
```

Remplacez `VOTRE_IP_HETZNER` par l'adresse IP de votre serveur.

### 3.2. Exécuter le script de configuration
Une fois connecté au serveur, téléchargez et exécutez le script de configuration:

```bash
# Télécharger le script (vous devrez d'abord pusher votre code sur Git)
# OU créez manuellement le fichier setup-server.sh et collez le contenu

# Rendre le script exécutable
chmod +x setup-server.sh

# Exécuter le script (optionnel: créer un utilisateur non-root)
sudo bash setup-server.sh deployer
```

Ce script va:
- Mettre à jour le système
- Installer Docker et Docker Compose
- Configurer le pare-feu (UFW)
- Installer Git et les outils nécessaires
- Créer un utilisateur "deployer" (optionnel)

**⚠️ IMPORTANT**: Après l'exécution, le script peut vous demander de redémarrer. Si c'est le cas:
```bash
reboot
```

Puis reconnectez-vous après quelques secondes.

---

## ÉTAPE 4: Déployer l'application

### 4.1. Pousser votre code sur Git (GitHub, GitLab, etc.)

Sur votre machine locale:

```bash
# Si vous n'avez pas encore de dépôt Git
git init
git add .
git commit -m "Initial commit"

# Créez un nouveau dépôt sur GitHub/GitLab et récupérez l'URL
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
git branch -M main
git push -u origin main
```

### 4.2. Cloner le projet sur le serveur Hetzner

Reconnectez-vous au serveur:

```bash
ssh root@VOTRE_IP_HETZNER
# OU si vous avez créé l'utilisateur deployer:
# ssh deployer@VOTRE_IP_HETZNER
```

Clonez votre projet:

```bash
# Cloner le dépôt
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git

# Entrer dans le dossier
cd VOTRE_REPO
```

### 4.3. Créer le fichier .env

Créez un fichier `.env` avec vos variables d'environnement:

```bash
nano .env
```

Collez ce contenu (en remplaçant par vos valeurs):

```bash
NODE_ENV=production
PORT=3000

# MongoDB Atlas (URL récupérée à l'étape 2)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority

# Codes d'accès (personnalisez-les!)
ACCESS_CODE=VotreCodeAcces123
DELETE_CODE=VotreCodeSuppr456

# Secret de session (générez une chaîne aléatoire longue et sécurisée)
SESSION_SECRET=votre-secret-super-long-et-aleatoire-ici-changez-moi

# Token Vinted (si vous l'utilisez)
VINTED_ACCESS_TOKEN=your_access_key,your_signing_key

# Configuration Puppeteer
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Sauvegardez avec `Ctrl+X`, puis `Y`, puis `Entrée`.

### 4.4. Rendre les scripts exécutables

```bash
chmod +x deploy.sh
chmod +x setup-server.sh
```

### 4.5. Lancer le déploiement

```bash
./deploy.sh
```

Ce script va:
1. Vérifier que le fichier `.env` existe
2. Arrêter les conteneurs existants (s'il y en a)
3. Construire l'image Docker
4. Nettoyer les anciennes images
5. Démarrer l'application

### 4.6. Vérifier que tout fonctionne

Vérifiez les logs:

```bash
docker-compose logs -f app
```

Vous devriez voir "✓ Connecté à MongoDB" et le serveur démarrer.

Appuyez sur `Ctrl+C` pour quitter les logs.

---

## ÉTAPE 5: Configurer le domaine et HTTPS (Optionnel mais recommandé)

### 5.1. Pointer votre domaine vers Hetzner

Dans les paramètres DNS de votre registrar (OVH, Gandi, etc.):
1. Créez un enregistrement **A** pointant vers l'IP de votre serveur Hetzner
2. Exemple: `app.mondomaine.com` → `VOTRE_IP_HETZNER`

### 5.2. Installer Nginx et Certbot pour HTTPS

Sur le serveur:

```bash
# Installer Nginx
sudo apt-get install -y nginx

# Installer Certbot pour les certificats SSL gratuits
sudo apt-get install -y certbot python3-certbot-nginx
```

### 5.3. Configurer Nginx

Créez un fichier de configuration:

```bash
sudo nano /etc/nginx/sites-available/web-scraper
```

Collez cette configuration (remplacez `app.mondomaine.com` par votre domaine):

```nginx
server {
    listen 80;
    server_name app.mondomaine.com;

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
    }
}
```

Activez la configuration:

```bash
sudo ln -s /etc/nginx/sites-available/web-scraper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.4. Obtenir un certificat SSL

```bash
sudo certbot --nginx -d app.mondomaine.com
```

Suivez les instructions. Certbot va automatiquement configurer HTTPS.

Le certificat se renouvellera automatiquement tous les 90 jours.

### 5.5. Mettre à jour le pare-feu

```bash
sudo ufw allow 'Nginx Full'
sudo ufw delete allow 3000/tcp  # On ferme l'accès direct au port 3000
sudo ufw reload
```

Votre application est maintenant accessible sur `https://app.mondomaine.com` !

---

## ÉTAPE 6: Maintenance et commandes utiles

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
```bash
# Sur votre machine locale
git add .
git commit -m "Nouvelles modifications"
git push

# Sur le serveur Hetzner
git pull
./deploy.sh
```

### Sauvegarder la base de données MongoDB
MongoDB Atlas fait des sauvegardes automatiques avec le plan gratuit.

### Surveiller les ressources
```bash
htop  # Ctrl+C pour quitter
docker stats  # Ctrl+C pour quitter
```

### Nettoyer Docker (libérer de l'espace)
```bash
docker system prune -a --volumes
```

---

## Coûts estimés

- **Serveur Hetzner CPX11**: ~€4.51/mois
- **Serveur Hetzner CPX21** (recommandé): ~€8.21/mois
- **MongoDB Atlas M0**: Gratuit (512 MB)
- **Certificat SSL**: Gratuit (Let's Encrypt)
- **Domaine**: ~€10/an (variable selon le registrar)

**Total mensuel**: ~€4.51 à €8.21/mois + domaine

---

## Dépannage

### L'application ne démarre pas
```bash
docker-compose logs app
```
Vérifiez les erreurs dans les logs.

### Erreur de connexion MongoDB
- Vérifiez que l'URL MongoDB dans `.env` est correcte
- Vérifiez que l'IP de votre serveur est autorisée dans MongoDB Atlas Network Access

### Le serveur ne répond pas
```bash
sudo ufw status  # Vérifier le pare-feu
docker-compose ps  # Vérifier que le conteneur tourne
```

### Erreur "Out of memory" avec Puppeteer
Augmentez la taille de votre serveur (passez à CPX21 avec 4 GB RAM).

---

## Support

- Documentation Hetzner: https://docs.hetzner.com/
- Documentation MongoDB Atlas: https://docs.atlas.mongodb.com/
- Documentation Docker: https://docs.docker.com/

---

**Félicitations !** 🎉 Votre application est maintenant en production sur Hetzner Cloud !
