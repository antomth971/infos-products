# Aide-mémoire rapide - Déploiement Hetzner

Guide ultra-rapide pour déployer sur Hetzner. Pour les détails complets, voir `HETZNER_DEPLOYMENT.md`.

## 🚀 Déploiement en 10 minutes

### 1. Créer le serveur Hetzner (3 min)
- Aller sur https://console.hetzner.cloud/
- Créer un serveur Ubuntu 22.04
- Taille recommandée: **CPX21** (3 vCPU, 4 GB RAM)
- Ajouter votre clé SSH
- Noter l'adresse IP

### 2. Configurer MongoDB Atlas (3 min)
- Créer un compte sur https://www.mongodb.com/cloud/atlas/register
- Créer un cluster gratuit (M0)
- Créer un utilisateur de base de données
- Autoriser l'accès depuis n'importe où (0.0.0.0/0)
- Copier l'URL de connexion

### 3. Configurer le serveur (2 min)
```bash
# Se connecter au serveur
ssh root@VOTRE_IP_HETZNER

# Télécharger et exécuter le script de configuration
# (Après avoir poussé votre code sur Git)
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
cd VOTRE_REPO
chmod +x setup-server.sh
sudo bash setup-server.sh
```

### 4. Déployer l'application (2 min)
```bash
# Créer le fichier .env
nano .env
```

Contenu minimal du `.env`:
```bash
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb+srv://user:pass@cluster.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority
ACCESS_CODE=VotreCode123
DELETE_CODE=VotreCodeDel456
SESSION_SECRET=votre-secret-super-long-et-aleatoire
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

Puis déployer:
```bash
chmod +x deploy.sh
./deploy.sh
```

### 5. Tester
```bash
# Vérifier que l'application tourne
docker-compose ps

# Voir les logs
docker-compose logs -f app
```

Votre application est accessible sur `http://VOTRE_IP_HETZNER:3000`

---

## 📝 Commandes essentielles

### Gestion de l'application
```bash
# Voir les logs en temps réel
docker-compose logs -f app

# Redémarrer
docker-compose restart

# Arrêter
docker-compose down

# Status
docker-compose ps
```

### Mise à jour du code
```bash
# Sur votre machine locale
git add .
git commit -m "Update"
git push

# Sur le serveur
cd VOTRE_REPO
git pull
./deploy.sh
```

### Monitoring
```bash
# Ressources système
htop

# Stats Docker
docker stats
```

---

## 🔒 Sécurité rapide

### Configurer le pare-feu
```bash
sudo ufw status
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable
```

### Changez TOUJOURS dans `.env`:
- `ACCESS_CODE`
- `DELETE_CODE`
- `SESSION_SECRET`

---

## 🌐 HTTPS avec domaine (optionnel)

```bash
# Installer Nginx et Certbot
sudo apt-get install -y nginx certbot python3-certbot-nginx

# Configurer Nginx (voir HETZNER_DEPLOYMENT.md)
sudo nano /etc/nginx/sites-available/web-scraper

# Obtenir le certificat SSL
sudo certbot --nginx -d votre-domaine.com
```

---

## 💰 Prix

- **CPX21** (recommandé): ~€8.21/mois
- **CPX11** (minimum): ~€4.51/mois
- MongoDB Atlas M0: Gratuit

---

## ❓ Problèmes courants

### L'app ne démarre pas
```bash
docker-compose logs app  # Voir l'erreur
```

### Erreur MongoDB
- Vérifier l'URL dans `.env`
- Vérifier Network Access dans MongoDB Atlas

### Port déjà utilisé
```bash
sudo lsof -i :3000
sudo kill -9 PID
```

---

## 📞 Support

Documentation complète: `HETZNER_DEPLOYMENT.md`
