# 🚀 Guide de Déploiement sur Render.com

Ce guide vous explique comment déployer votre application Web Scraper sur Render avec MongoDB Atlas.

## 📋 Prérequis

- ✅ Un compte GitHub
- ✅ Un compte Render.com (gratuit) - https://render.com
- ✅ MongoDB Atlas configuré (voir `MONGODB_SETUP.md`)
- ✅ Votre code sur GitHub

---

## 🔧 Étape 1 : Préparation du code

### 1.1 Vérifier que tous les fichiers sont prêts

```bash
# Vérifier les fichiers de configuration
ls Dockerfile render.yaml package.json
```

Vous devriez voir :
- ✅ `Dockerfile` - Configuration Docker
- ✅ `render.yaml` - Configuration Render
- ✅ `package.json` - Dépendances Node.js

### 1.2 Commit et push vers GitHub

```bash
# Vérifier le statut
git status

# Ajouter tous les fichiers modifiés
git add .

# Créer un commit
git commit -m "Migration vers MongoDB Atlas + configuration Render"

# Pousser vers GitHub
git push origin master
```

---

## 🌐 Étape 2 : Créer le service sur Render

### 2.1 Connexion à Render

1. Allez sur https://dashboard.render.com
2. Cliquez sur **"New +"** (en haut à droite)
3. Sélectionnez **"Web Service"**

### 2.2 Connecter votre repository GitHub

1. Cliquez sur **"Connect GitHub"** (si pas encore fait)
2. Autorisez Render à accéder à vos repositories
3. Trouvez et sélectionnez votre repository `infos_product`

### 2.3 Configuration du service

Render devrait détecter automatiquement le `render.yaml`. Sinon, configurez manuellement :

**Configuration de base :**
- **Name** : `web-scraper` (ou le nom de votre choix)
- **Environment** : `Docker`
- **Region** : `Frankfurt (EU Central)` (le plus proche)
- **Branch** : `master`
- **Dockerfile Path** : `./Dockerfile`
- **Plan** : `Free`

**Ne cliquez PAS encore sur "Create Web Service" !** Avant, il faut configurer les variables d'environnement.

---

## 🔐 Étape 3 : Configuration des Variables d'Environnement

**IMPORTANT** : Avant de déployer, vous DEVEZ configurer MongoDB.

### 3.1 Ajouter les variables d'environnement

Dans la page de configuration de votre service, descendez jusqu'à la section **"Environment Variables"** :

Ajoutez ces variables :

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://anthonymathieu21_db_user:8h0JvhlDPBoiBTei@smartbuyfrance.lgypadf.mongodb.net/web-scraper?retryWrites=true&w=majority&appName=smartbuyfrance` |

**⚠️ IMPORTANT** : Remplacez `MONGODB_URI` par votre propre URL MongoDB Atlas si différente.

### 3.2 Vérifier la configuration

Assurez-vous d'avoir :
- ✅ `NODE_ENV = production`
- ✅ `MONGODB_URI = mongodb+srv://...` (votre URL complète)

---

## 🚀 Étape 4 : Déployer !

### 4.1 Lancer le déploiement

1. Cliquez sur **"Create Web Service"** (en bas de la page)
2. Render va commencer à déployer votre application

### 4.2 Suivre le déploiement

Vous verrez les logs en temps réel :

```
==> Downloading cache...
==> Building image...
==> Pulling image...
==> Starting service...
✓ Connecté à MongoDB
Serveur démarré sur http://localhost:3000
==> Your service is live 🎉
```

**Le déploiement prend environ 5-10 minutes** :
- ⏳ Installation de Chromium et dépendances système
- ⏳ Installation des dépendances Node.js
- ⏳ Build de l'image Docker
- ⏳ Démarrage du service

### 4.3 Vérifier que le déploiement a réussi

Une fois terminé, vous verrez :
- ✅ **"Your service is live"** en vert
- ✅ `✓ Connecté à MongoDB` dans les logs
- ✅ Votre URL d'application : `https://web-scraper-xxxx.onrender.com`

---

## ✅ Étape 5 : Tester votre application

### 5.1 Accéder à l'application

Cliquez sur l'URL fournie par Render (ex: `https://web-scraper-xxxx.onrender.com`)

Vous devriez voir votre interface web !

### 5.2 Tester l'API

Testez que l'API fonctionne :

```bash
# Health check
curl https://web-scraper-xxxx.onrender.com/api/health

# Vérifier les produits
curl https://web-scraper-xxxx.onrender.com/api/items
```

### 5.3 Tester un scraping

1. Ouvrez l'interface web
2. Collez une URL Amazon/Vevor/Cdiscount
3. Cliquez sur "Scraper"
4. Vérifiez que les données sont extraites et sauvegardées dans MongoDB

---

## 🔄 Mises à jour automatiques

Chaque fois que vous faites un `git push` sur votre branche `master`, Render redéploiera automatiquement votre application !

```bash
# Faire des modifications
git add .
git commit -m "Amélioration du scraping"
git push

# Render redéploie automatiquement ! ✅
```

---

## ⚠️ Limitations du Plan Gratuit

### Cold Start (sommeil automatique)
- Le service s'endort après **15 minutes d'inactivité**
- Premier chargement après inactivité : **30-60 secondes**
- **Solution** : Utilisez UptimeRobot pour maintenir le service actif

### Limites de ressources
- **750 heures/mois** (suffisant pour usage personnel)
- Le service peut redémarrer toutes les 24-48h
- Ressources CPU/RAM limitées (scraping plus lent qu'en local)

### ✅ Avantages
- **Données persistantes** : Grâce à MongoDB Atlas, vos données ne sont JAMAIS perdues !
- **HTTPS gratuit** : Certificat SSL automatique
- **Déploiement automatique** : Push et c'est déployé !

---

## 🎯 Empêcher le Cold Start avec UptimeRobot

### Pourquoi ?
Pour que votre application reste toujours disponible rapidement.

### Comment ?

1. **Créez un compte gratuit** sur https://uptimerobot.com
2. Cliquez sur **"Add New Monitor"**
3. Configurez :
   - **Monitor Type** : `HTTP(s)`
   - **Friendly Name** : `Web Scraper`
   - **URL** : `https://web-scraper-xxxx.onrender.com/api/health`
   - **Monitoring Interval** : `5 minutes`
4. Cliquez sur **"Create Monitor"**

UptimeRobot va pinger votre application toutes les 5 minutes, l'empêchant de s'endormir !

---

## 🐛 Dépannage

### Erreur "Connexion MongoDB refused"

**Problème** : Render ne peut pas se connecter à MongoDB Atlas

**Solutions** :
1. Vérifiez que `MONGODB_URI` est correctement configurée dans les variables d'environnement
2. Dans MongoDB Atlas → **Network Access** → Vérifiez que `0.0.0.0/0` est autorisé
3. Vérifiez que le mot de passe dans l'URL ne contient pas de caractères spéciaux non encodés

### Erreur "Puppeteer can't find Chrome"

**Problème** : Chromium n'est pas installé

**Solution** : Vérifiez que :
- Render utilise bien **Docker** (pas Node.js)
- Le `Dockerfile` contient l'installation de Chromium
- La variable `PUPPETEER_EXECUTABLE_PATH` est correctement définie

### Le scraping est très lent

**Problème** : Ressources limitées sur le plan gratuit

**C'est normal !** Le plan gratuit a des ressources limitées. Solutions :
- Scraper un seul produit à la fois
- Éviter de scraper pendant les heures de pointe
- Passer au plan payant (7$/mois) pour de meilleures performances

### Les images ne s'affichent pas

**Problème** : CORS ou sélecteurs CSS obsolètes

**Solutions** :
1. Utilisez le proxy `/api/download-image` pour les images
2. Vérifiez que les sélecteurs CSS sont à jour dans `backend/server.js`

---

## 📊 Monitoring et Logs

### Voir les logs en temps réel

Dans le dashboard Render :
1. Cliquez sur votre service
2. Onglet **"Logs"**
3. Vous verrez tous les logs en temps réel

### Métriques

Dans l'onglet **"Metrics"** :
- Utilisation CPU
- Utilisation mémoire
- Requêtes HTTP
- Temps de réponse

---

## 🔒 Sécurité

### Variables d'environnement sensibles

- ✅ Les variables d'environnement sont **chiffrées** sur Render
- ✅ Ne JAMAIS commit le fichier `.env` dans Git
- ✅ `.env` est dans `.gitignore`

### MongoDB Atlas

- ✅ Connexion chiffrée (SSL/TLS)
- ✅ Authentification par utilisateur/mot de passe
- ✅ Accès réseau restreint (même si 0.0.0.0/0, il faut l'authentification)

---

## 📚 Ressources Utiles

- **Render Documentation** : https://render.com/docs
- **MongoDB Atlas** : https://cloud.mongodb.com
- **UptimeRobot** : https://uptimerobot.com
- **Support Render** : https://render.com/docs/support

---

## 🎉 Félicitations !

Votre application est maintenant déployée en production avec :
- ✅ **HTTPS automatique**
- ✅ **Données persistantes** (MongoDB Atlas)
- ✅ **Déploiement automatique** (Git push)
- ✅ **Monitoring** (UptimeRobot)
- ✅ **Scraping de 8 sites** e-commerce

**URL de votre application** : `https://web-scraper-xxxx.onrender.com`

Profitez-en ! 🚀
