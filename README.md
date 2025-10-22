# Web Scraper

Application de scraping web avec interface utilisateur moderne.

## Structure du projet

```
infos_product/
├── backend/           # Serveur Node.js
│   ├── server.js      # API Express
│   └── package.json   # Dépendances backend
├── frontend/          # Interface utilisateur
│   ├── index.html     # Page principale
│   ├── style.css      # Styles
│   └── app.js         # Logique JavaScript
└── README.md
```

## Fonctionnalités

- Extraction automatique des données d'une page web :
  - Titre H1
  - Prix (.DM_co-shopPrice)
  - Liste de descriptions (ul.detailGuide_cont > li)
  - Images (.DM_LTL_container-thumb img)
- Stockage persistant dans fichier JSON (backend/database.json)
- Vérification des URL déjà scannées (alerte automatique)
- Barre de recherche par nom
- Suppression d'éléments avec bouton poubelle
- Interface utilisateur moderne et responsive
- Loader animé pendant l'extraction
- Affichage détaillé avec galerie d'images et prix

## Installation

### Backend

```bash
cd backend
npm install
```

### Frontend

Aucune installation nécessaire pour le frontend (HTML/CSS/JS vanilla).

## Utilisation

### 1. Démarrer le serveur backend

```bash
cd backend
npm start
```

Le serveur démarre sur http://localhost:3000

### 2. Ouvrir l'interface

Ouvrez simplement le fichier `frontend/index.html` dans votre navigateur.

### 3. Utiliser l'application

1. Entrez une URL dans le champ de saisie
2. Cliquez sur "Scraper"
3. Attendez que l'extraction se termine (loader visible)
4. L'élément apparaît dans la liste de gauche
5. Cliquez sur un élément pour voir ses détails

## API Backend

### POST /api/scrape

Extrait les données d'une page web et les enregistre dans la base de données.

**Body:**
```json
{
  "url": "https://example.com/page"
}
```

**Response (succès):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Titre H1 de la page",
    "price": "29,99 €",
    "description": ["Item 1", "Item 2", "..."],
    "images": ["url1.jpg", "url2.jpg", "..."],
    "url": "https://example.com/page",
    "createdAt": "2025-01-01T12:00:00.000Z"
  }
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

### GET /api/items

Récupère tous les éléments de la base de données.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Produit 1",
      "price": "29,99 €",
      "description": ["..."],
      "images": ["..."],
      "url": "...",
      "createdAt": "..."
    }
  ]
}
```

### DELETE /api/items/:id

Supprime un élément de la base de données.

**Response:**
```json
{
  "success": true,
  "data": []
}
```

### GET /api/health

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
- Node.js
- Express
- Axios (requêtes HTTP)
- Cheerio (parsing HTML)
- CORS

### Frontend
- HTML5
- CSS3 (Grid, Flexbox, Animations)
- JavaScript (ES6+)
- LocalStorage API

## Développement

Pour le développement avec rechargement automatique :

```bash
cd backend
npm run dev
```

## Notes

- Les données sont stockées dans un fichier JSON (backend/database.json)
- Le fichier database.json est créé automatiquement au premier démarrage
- Le serveur backend doit être démarré avant d'utiliser l'application
- Les images sont chargées depuis leurs URLs originales
- La recherche s'effectue en temps réel sur les noms des produits
- Une alerte s'affiche si vous essayez de scanner une URL déjà présente
- Les éléments supprimés sont définitivement retirés de la base de données
