# Web Scraper

Application de scraping web sécurisée avec interface utilisateur moderne et support multi-fournisseurs.

## Structure du projet

```
infos_product/
├── backend/           # Serveur Node.js
│   ├── server.js      # API Express
│   ├── models/        # Modèles MongoDB
│   │   └── Product.js
│   └── package.json   # Dépendances backend
├── frontend/          # Interface utilisateur
│   ├── index.html     # Page principale
│   ├── login.html     # Page de connexion
│   ├── style.css      # Styles
│   └── app.js         # Logique JavaScript
└── README.md
```

## Fonctionnalités

### 🔐 Sécurité
- **Authentification par code d'accès** (8 caractères)
- **Session sécurisée de 4 heures** sur l'appareil
- **Protection des suppressions** avec code de confirmation différent
- Redirection automatique vers la page de login si non connecté

### 🌐 Scraping multi-fournisseurs
Support de plusieurs sites e-commerce :
- **Vevor** (.vevor.)
- **Amazon** (www.amazon.)
- **Cdiscount** (www.cdiscount.com)
- **Manomano** (www.manomano.fr)
- **Gifi** (www.gifi.fr)
- **Leroy Merlin** (www.leroymerlin.fr)
- **AliExpress** (.aliexpress.)
- **Bol.com** (www.bol.com)

### 📦 Extraction de données
- Titre des produits
- Prix (formatés selon le fournisseur)
- Descriptions détaillées
- Images en haute résolution
- URL source
- Date d'ajout

### 🛠️ Fonctionnalités avancées
- **Puppeteer** : Contournement des protections anti-bot
- **Traitement en lot** : Scanner plusieurs URLs simultanément
- **Export Excel** : Téléchargement de tous les produits en XLSX
- **Téléchargement ZIP** : Images groupées par produit
- **Recherche en temps réel** par nom de produit
- **Tri chronologique** : Affichage du plus ancien au plus récent
- **Base MongoDB** : Stockage persistant et performant
- Vérification des URL déjà scannées
- Interface responsive et moderne

## Installation

### Prérequis

- **Node.js** (v18 ou supérieur)
- **MongoDB** (local ou MongoDB Atlas)

### 1. Installation du Backend

```bash
cd backend
npm install
```

### 2. Configuration MongoDB

Créez un fichier `.env` dans le dossier `backend/` :

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/web-scraper
# ou pour MongoDB Atlas :
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/web-scraper

# Codes d'accès (personnalisables)
ACCESS_CODE=ABC12345        # Code pour accéder au site
DELETE_CODE=DEL98765        # Code pour supprimer un produit

# Session
SESSION_SECRET=votre-secret-super-secret-a-changer

# Port (optionnel)
PORT=3000
```

**Note** : Si vous utilisez MongoDB Atlas, consultez `MONGODB_SETUP.md` pour plus de détails.

### 3. Frontend

Aucune installation nécessaire pour le frontend (HTML/CSS/JS vanilla).

## Utilisation

### 1. Démarrer le serveur backend

```bash
cd backend
npm start
```

Le serveur démarre sur http://localhost:3000 et affiche :
```
✓ Serveur démarré sur http://localhost:3000

🔐 Codes d'accès :
   - Code d'accès au site : ABC12345
   - Code de suppression : DEL98765

⏱️  Durée de session : 4 heures
```

### 2. Se connecter

1. Ouvrez http://localhost:3000 dans votre navigateur
2. Vous serez automatiquement redirigé vers la page de login
3. Entrez le **code d'accès** (par défaut : `ABC12345`)
4. Cliquez sur "Accéder"

Une fois connecté, vous avez accès au site pendant **4 heures**.

### 3. Utiliser l'application

#### Scanner un produit
1. Entrez une URL de produit dans le champ de saisie
2. Cliquez sur "Scraper"
3. Attendez que l'extraction se termine (loader visible)
4. Le produit apparaît dans la liste de gauche
5. Cliquez sur un produit pour voir ses détails complets

#### Scanner plusieurs produits
1. Entrez plusieurs URLs (une par ligne) dans le champ de saisie
2. Cliquez sur "Scraper"
3. Un récapitulatif s'affiche une fois le traitement terminé

#### Supprimer un produit
1. Cliquez sur le bouton 🗑️ à côté du produit
2. Entrez le **code de suppression** (par défaut : `DEL98765`)
3. Confirmez la suppression

#### Export Excel
Cliquez sur "📊 Exporter en Excel" pour télécharger tous les produits dans un fichier Excel.

#### Télécharger les images
Dans les détails d'un produit, cliquez sur "📥 Télécharger toutes les images" pour obtenir un fichier ZIP avec toutes les images du produit.

## API Backend

### Authentification

#### GET /api/auth/check
Vérifie si l'utilisateur est connecté.

**Response:**
```json
{
  "authenticated": true
}
```

#### POST /api/auth/login
Connexion avec le code d'accès.

**Body:**
```json
{
  "code": "ABC12345"
}
```

**Response (succès):**
```json
{
  "success": true,
  "message": "Accès autorisé"
}
```

**Response (erreur):**
```json
{
  "success": false,
  "error": "Code invalide"
}
```

#### POST /api/auth/logout
Déconnexion.

**Response:**
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

### Produits

#### POST /api/scrape
Extrait les données d'une page web et les enregistre dans MongoDB.

**Body:**
```json
{
  "url": "https://www.vevor.fr/produit/..."
}
```

**Response (succès):**
```json
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "name": "Titre du produit",
    "price": "29,99 €",
    "description": ["Item 1", "Item 2"],
    "images": ["url1.jpg", "url2.jpg"],
    "url": "https://...",
    "supplier": "Vevor",
    "createdAt": "2025-01-01T12:00:00.000Z"
  },
  "usedPuppeteer": true
}
```

**Response (URL déjà scannée):**
```json
{
  "success": false,
  "error": "URL déjà scannée",
  "alreadyScanned": true
}
```

#### GET /api/items
Récupère tous les produits (triés du plus ancien au plus récent).

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "Produit 1",
      "price": "29,99 €",
      "description": ["..."],
      "images": ["..."],
      "url": "...",
      "supplier": "Vevor",
      "createdAt": "..."
    }
  ]
}
```

#### DELETE /api/items/:id
Supprime un produit (nécessite authentification + code de suppression).

**Body:**
```json
{
  "deleteCode": "DEL98765"
}
```

**Response (succès):**
```json
{
  "success": true,
  "data": []
}
```

**Response (non authentifié):**
```json
{
  "success": false,
  "error": "Accès non autorisé. Veuillez vous connecter."
}
```

**Response (code invalide):**
```json
{
  "success": false,
  "error": "Code de suppression invalide"
}
```

### Export

#### GET /api/export/excel
Exporte tous les produits en fichier Excel (.xlsx).

**Response:** Fichier Excel téléchargeable

#### POST /api/download-image
Proxy pour télécharger des images (contournement CORS).

**Body:**
```json
{
  "url": "https://image.example.com/photo.jpg"
}
```

**Response:** Blob de l'image

### Santé

#### GET /api/health
Vérifie l'état du serveur.

**Response:**
```json
{
  "status": "OK",
  "message": "API is running"
}
```

## Technologies utilisées

### Backend
- **Node.js** (v20+)
- **Express** - Framework web
- **MongoDB** + **Mongoose** - Base de données NoSQL
- **express-session** - Gestion des sessions
- **Puppeteer** - Automatisation du navigateur et contournement anti-bot
- **Axios** - Requêtes HTTP
- **Cheerio** - Parsing HTML
- **XLSX** - Export Excel
- **CORS** - Cross-Origin Resource Sharing
- **dotenv** - Variables d'environnement

### Frontend
- **HTML5**
- **CSS3** (Grid, Flexbox, Animations)
- **JavaScript** (ES6+)
- **JSZip** - Création de fichiers ZIP
- Fetch API avec credentials

## Développement

Pour le développement avec rechargement automatique :

```bash
cd backend
npm run dev
```

Le serveur redémarrera automatiquement à chaque modification avec **nodemon**.

## Sécurité

### Codes d'accès
Les codes par défaut sont :
- **Accès au site** : `ABC12345`
- **Suppression** : `DEL98765`

⚠️ **Important** : Changez ces codes dans le fichier `.env` en production !

### Sessions
- Durée : **4 heures**
- Cookie httpOnly pour plus de sécurité
- Session invalidée après expiration

### Bonnes pratiques
1. Ne partagez jamais le fichier `.env`
2. Utilisez des codes complexes en production
3. Activez HTTPS en production (`secure: true` dans les cookies)
4. Configurez une `SESSION_SECRET` forte

## Notes

- **Base de données** : MongoDB (plus de fichier JSON)
- **Tri** : Les produits sont affichés du plus ancien au plus récent
- **Images** : Téléchargées en haute résolution quand disponible
- **Anti-bot** : Puppeteer simule un vrai navigateur
- **Batch** : Possibilité de scanner plusieurs URLs à la fois
- **Export** : Format Excel avec toutes les données
- **ZIP** : Images groupées par produit
- Les produits supprimés sont définitivement retirés de MongoDB
