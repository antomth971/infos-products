# 🎉 MongoDB Atlas configuré avec succès !

Votre application utilise maintenant MongoDB Atlas pour une **persistance permanente des données**.

## ✅ Configuration actuelle

- **Cluster** : `smartbuyfrance`
- **Base de données** : `web-scraper`
- **Utilisateur** : `anthonymathieu21_db_user`
- **Statut** : ✅ Connecté

## 🚀 Utilisation

### En local (développement)

```bash
# Démarrer le serveur (utilise Google DNS automatiquement)
npm start

# Ou en mode développement avec rechargement automatique
npm run dev
```

L'application utilise automatiquement Google DNS (8.8.8.8) pour contourner les problèmes de résolution DNS locale.

### En production (Render)

Sur Render, utilisez simplement :
```bash
npm run start:prod
```

Le DNS de Render fonctionne correctement, pas besoin de forcer Google DNS.

## 🔧 Configuration

### Variables d'environnement

Votre fichier `.env` contient :
```bash
MONGODB_URI=mongodb+srv://anthonymathieu21_db_user:8h0JvhlDPBoiBTei@smartbuyfrance.lgypadf.mongodb.net/web-scraper?retryWrites=true&w=majority&appName=smartbuyfrance
```

### Sur Render

1. Allez dans votre dashboard Render
2. Sélectionnez votre service `web-scraper`
3. Allez dans **Environment**
4. Ajoutez/Vérifiez la variable :
   - **Key** : `MONGODB_URI`
   - **Value** : (même URL que ci-dessus)

## 📊 Accès aux données

### Via MongoDB Atlas

1. Connectez-vous sur https://cloud.mongodb.com
2. Menu **Database** → Cliquez sur **Browse Collections**
3. Sélectionnez la base `web-scraper`
4. Vous verrez la collection `products` avec tous vos produits scrapés

### Via l'application

- **Interface web** : http://localhost:3000
- **API** :
  - `GET /api/items` - Liste tous les produits
  - `POST /api/scrape` - Scraper un nouveau produit
  - `DELETE /api/items/:id` - Supprimer un produit
  - `GET /api/export/excel` - Exporter en Excel

## 🛠️ Dépannage

### Problème DNS local

Si vous avez l'erreur `querySrv ECONNREFUSED`, c'est un problème DNS local. Solution :
- L'application utilise automatiquement `start-with-dns.js` qui force Google DNS
- Ou changez vos DNS système pour utiliser 8.8.8.8 et 8.8.4.4

### Erreur d'authentification

Si vous voyez "Bad auth", vérifiez que :
1. Le mot de passe dans `MONGODB_URI` est correct
2. L'utilisateur existe dans MongoDB Atlas (Database Access)
3. Network Access autorise `0.0.0.0/0`

### Connexion timeout

Si la connexion timeout :
1. Vérifiez que le cluster est **Active** (point vert) dans MongoDB Atlas
2. Vérifiez Network Access → `0.0.0.0/0` doit être présent
3. Attendez 2-3 minutes après avoir modifié Network Access

## 📚 Ressources

- **MongoDB Atlas** : https://cloud.mongodb.com
- **Documentation Mongoose** : https://mongoosejs.com
- **Guide complet** : Voir `MONGODB_SETUP.md`

---

**Vos données sont maintenant sauvegardées de manière permanente ! 🎉**
