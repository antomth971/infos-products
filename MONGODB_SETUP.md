# Configuration MongoDB Atlas - Guide Complet

Vos données seront maintenant **persistées de manière permanente** dans MongoDB Atlas (cloud gratuit).

## Étape 1 : Créer un compte MongoDB Atlas

1. Allez sur https://www.mongodb.com/cloud/atlas/register
2. Créez un compte gratuit (ou connectez-vous avec Google/GitHub)
3. Choisissez le plan **M0 FREE** (512 MB de stockage, parfait pour ce projet)

## Étape 2 : Créer un cluster

1. Une fois connecté, cliquez sur **"Build a Database"**
2. Sélectionnez **"M0 FREE"** (gratuit pour toujours)
3. Choisissez une région proche de vous (ex: `eu-west-1` pour l'Europe)
4. Donnez un nom à votre cluster (ex: `Cluster0`) - laissez par défaut si vous voulez
5. Cliquez sur **"Create"**
6. Attendez 2-3 minutes que le cluster soit créé

## Étape 3 : Créer un utilisateur de base de données

1. Dans le menu de gauche, cliquez sur **"Database Access"**
2. Cliquez sur **"Add New Database User"**
3. Choisissez **"Password"** comme méthode d'authentification
4. Entrez un nom d'utilisateur (ex: `webscraperuser`)
5. Générez un mot de passe sécurisé (NOTEZ-LE, vous en aurez besoin !)
6. Dans **"Database User Privileges"**, sélectionnez **"Read and write to any database"**
7. Cliquez sur **"Add User"**

## Étape 4 : Autoriser les connexions réseau

1. Dans le menu de gauche, cliquez sur **"Network Access"**
2. Cliquez sur **"Add IP Address"**
3. Cliquez sur **"Allow Access from Anywhere"** (recommandé pour Render)
   - Cela ajoutera `0.0.0.0/0` à la liste blanche
4. Cliquez sur **"Confirm"**

## Étape 5 : Obtenir l'URL de connexion

1. Retournez dans **"Database"** (menu de gauche)
2. Sur votre cluster, cliquez sur **"Connect"**
3. Sélectionnez **"Connect your application"**
4. Choisissez **"Node.js"** comme driver et **"5.5 or later"** comme version
5. Copiez l'URL de connexion qui ressemble à :
   ```
   mongodb+srv://webscraperuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. **IMPORTANT** : Remplacez `<password>` par le mot de passe que vous avez créé à l'étape 3
7. Ajoutez le nom de la base de données après `.net/` :
   ```
   mongodb+srv://webscraperuser:VOTRE_MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority
   ```

## Étape 6 : Configuration en local (développement)

1. Créez un fichier `.env` à la racine du projet (copiez `.env.example`)
2. Ajoutez votre URL MongoDB :
   ```bash
   MONGODB_URI=mongodb+srv://webscraperuser:VOTRE_MOT_DE_PASSE@cluster0.xxxxx.mongodb.net/web-scraper?retryWrites=true&w=majority
   NODE_ENV=development
   PORT=3000
   ```
3. Testez en local :
   ```bash
   npm install
   npm start
   ```
4. Vérifiez dans la console que vous voyez : `✓ Connecté à MongoDB`

## Étape 7 : Configuration sur Render (production)

1. Allez dans votre dashboard Render
2. Sélectionnez votre service web (web-scraper)
3. Cliquez sur **"Environment"** dans le menu de gauche
4. Ajoutez une nouvelle variable d'environnement :
   - **Key** : `MONGODB_URI`
   - **Value** : Collez votre URL MongoDB complète
5. Cliquez sur **"Save Changes"**
6. Render va redéployer automatiquement votre application

## Étape 8 : Vérification

1. Une fois déployé, allez sur l'URL de votre application Render
2. Scannez un nouveau produit
3. Dans MongoDB Atlas, allez dans **"Browse Collections"**
4. Vous devriez voir votre base de données `web-scraper` et la collection `products`
5. Vos données sont maintenant **persistées de manière permanente** !

## Migration des données existantes (optionnel)

Si vous avez des données dans l'ancien fichier `database.json`, vous pouvez les migrer :

1. Ouvrez `backend/database.json`
2. Dans MongoDB Atlas, cliquez sur **"Browse Collections"** > **"Add My Own Data"**
3. Créez une collection `products` dans la base `web-scraper`
4. Cliquez sur **"Insert Document"** et copiez-collez chaque produit
5. OU utilisez MongoDB Compass pour importer le JSON en masse

## Dépannage

### Erreur "Bad auth"
- Vérifiez que le mot de passe dans l'URL est correct
- Assurez-vous qu'il n'y a pas de caractères spéciaux non encodés

### Erreur "Connection timeout"
- Vérifiez que `0.0.0.0/0` est dans Network Access
- Attendez 2-3 minutes après avoir ajouté l'IP

### Erreur "Database not found"
- Assurez-vous d'avoir ajouté `/web-scraper` dans l'URL après `.net/`

## Support

- Documentation MongoDB Atlas : https://www.mongodb.com/docs/atlas/
- Documentation Mongoose : https://mongoosejs.com/docs/

---

**Félicitations !** Vos données sont maintenant sauvegardées de manière permanente dans le cloud. Plus de perte de données au redémarrage ! 🎉
