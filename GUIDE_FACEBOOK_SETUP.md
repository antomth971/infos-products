# 📘 Guide d'installation Facebook Marketplace

Ce guide explique comment configurer l'intégration Facebook Marketplace pour votre application.

## 📋 Prérequis

- Un compte Facebook Business/Page professionnelle
- Accès à votre Page Facebook
- Les identifiants de votre page

---

## 🚀 Étape 1 : Créer une Application Facebook Developers

### 1.1 Aller sur Facebook Developers

1. Connectez-vous sur **https://developers.facebook.com/** avec votre compte Facebook professionnel
2. Cliquez sur **"Mes Apps"** (en haut à droite)
3. Cliquez sur **"Créer une App"**

### 1.2 Configurer l'application

1. **Type d'application** : Sélectionnez **"Business"**
2. Cliquez sur **"Suivant"**

3. **Détails de l'app** :
   - **Nom de l'app** : `Gestion Marketplace [Votre Nom]`
   - **Email de contact** : Votre email professionnel
   - **Page Business** : Sélectionnez votre page Facebook

4. Cliquez sur **"Créer l'app"**

---

## 🔑 Étape 2 : Récupérer les identifiants

### 2.1 App ID et App Secret

1. Dans le tableau de bord de votre app, allez dans **"Paramètres" > "Paramètres de base"**

2. **Notez ces informations** :
   - **ID de l'application (App ID)** : Un nombre comme `123456789012345`
   - **Clé secrète de l'app (App Secret)** : Cliquez sur **"Afficher"** pour la voir

⚠️ **IMPORTANT** : Ne partagez JAMAIS ces informations publiquement !

### 2.2 ID de votre Page Facebook

1. Allez sur votre Page Facebook : `https://facebook.com/[votre-page]`
2. Cliquez sur **"À propos"** (dans le menu de gauche)
3. Faites défiler jusqu'à **"Plus d'informations"**
4. Trouvez **"ID de la Page"** (un nombre comme `987654321098765`)

---

## ⚙️ Étape 3 : Configurer les produits Facebook

### 3.1 Ajouter "Connexion Facebook"

1. Dans votre app Facebook, allez dans **"Produits"** (menu de gauche)
2. Trouvez **"Connexion Facebook"** et cliquez sur **"Configurer"**
3. Dans les paramètres de **"Connexion Facebook"** :
   - Faites défiler jusqu'à **"URI de redirection OAuth valides"**
   - Ajoutez ces URLs :
     - `http://localhost:3000/api/facebook/callback` (pour le développement local)
     - `https://votre-domaine-production.com/api/facebook/callback` (pour la production)
   - Cliquez sur **"Enregistrer les modifications"**

### 3.2 Permissions nécessaires

Les permissions suivantes seront demandées automatiquement lors de la connexion :
- ✅ `pages_manage_posts` - Créer/modifier les publications
- ✅ `pages_read_engagement` - Lire les publications
- ✅ `catalog_management` - Gérer le catalogue Marketplace
- ✅ `business_management` - Accéder au Business Manager

---

## 📝 Étape 4 : Configurer l'application Web

### 4.1 Créer le fichier .env

Dans le dossier `backend/`, créez un fichier `.env` (sans extension) :

```bash
# Configuration MongoDB
MONGODB_URI=mongodb://localhost:27017/web-scraper

# Codes d'accès
ACCESS_CODE=ABC12345
DELETE_CODE=DEL98765

# Session secret
SESSION_SECRET=votre-secret-super-secret-a-changer

# Facebook API Configuration
FACEBOOK_APP_ID=123456789012345
FACEBOOK_APP_SECRET=votre_app_secret_ici
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/facebook/callback
FACEBOOK_PAGE_ID=987654321098765

# Environnement
NODE_ENV=development
PORT=3000
```

⚠️ **Remplacez** :
- `123456789012345` par votre **App ID**
- `votre_app_secret_ici` par votre **App Secret**
- `987654321098765` par votre **Page ID**

### 4.2 Pour la production

Modifiez la ligne :
```bash
FACEBOOK_CALLBACK_URL=https://votre-domaine.com/api/facebook/callback
```

---

## ✅ Étape 5 : Tester la connexion

### 5.1 Démarrer l'application

```bash
cd backend
npm start
```

### 5.2 Se connecter à Facebook

1. Ouvrez votre navigateur : `http://localhost:3000`
2. Connectez-vous avec votre code d'accès
3. Cliquez sur **"📱 Facebook Marketplace"**
4. Cliquez sur **"Se connecter"**
5. Autorisez les permissions demandées
6. Vous serez redirigé vers la page avec le message **"✅ Connecté à Facebook avec succès !"**

---

## 🎯 Utilisation

### Récupérer vos annonces

Une fois connecté, toutes vos annonces Marketplace existantes s'affichent automatiquement dans l'onglet **"Mes Publications"**.

### Créer une annonce

1. Allez dans l'onglet **"Ajouter un Produit"**
2. Recherchez un produit dans la barre de recherche
3. Cliquez sur le produit désiré
4. Modifiez les informations si nécessaire
5. Cliquez sur **"Créer la publication"**
6. L'annonce sera créée sur Facebook Marketplace !

### Modifier une annonce

1. Dans l'onglet **"Mes Publications"**
2. Cliquez sur **"✏️ Modifier"** sur l'annonce
3. Modifiez les informations
4. Cliquez sur **"Enregistrer"**

### Supprimer une annonce

1. Cliquez sur **"🗑️"** sur l'annonce
2. Confirmez la suppression
3. L'annonce sera supprimée de Facebook Marketplace

---

## 🔧 Dépannage

### Erreur "Non connecté à Facebook"

**Solution** : Cliquez sur le bouton **"Se connecter"** dans la bannière jaune en haut de la page.

### Erreur "Aucune page Facebook trouvée"

**Solution** :
1. Vérifiez que votre compte Facebook possède bien une Page Business
2. Vérifiez que le `FACEBOOK_PAGE_ID` dans le fichier `.env` est correct

### Erreur "Code d'autorisation manquant"

**Solution** :
1. Vérifiez que l'URL de callback dans Facebook Developers correspond à celle dans le `.env`
2. Vérifiez que l'URL de callback est bien ajoutée dans **"URI de redirection OAuth valides"**

### Erreur lors de la création d'annonce

**Solution** :
1. Vérifiez que votre Page Facebook a accès à Marketplace
2. Vérifiez que toutes les permissions ont été accordées
3. Consultez les logs du serveur pour plus de détails

### Token expiré

**Solution** : Le token a une durée de 60 jours. Déconnectez-vous et reconnectez-vous pour obtenir un nouveau token.

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** : Les erreurs détaillées s'affichent dans la console du serveur
2. **Vérifiez le fichier .env** : Assurez-vous que tous les identifiants sont corrects
3. **Contactez le support** : Envoyez les logs d'erreur pour diagnostic

---

## 🔒 Sécurité

⚠️ **IMPORTANT** :

- Ne partagez JAMAIS votre `.env` ou vos identifiants Facebook
- Ne commitez JAMAIS le fichier `.env` dans Git (il est dans `.gitignore`)
- Changez régulièrement votre `SESSION_SECRET`
- Utilisez HTTPS en production

---

## 🎉 C'est terminé !

Vous pouvez maintenant gérer vos annonces Facebook Marketplace directement depuis votre application !

✅ Récupération des annonces existantes
✅ Création d'annonces depuis vos produits scrapés
✅ Modification d'annonces
✅ Suppression d'annonces

**Bon usage !** 🚀
