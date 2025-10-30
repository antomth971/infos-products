# Script de simulation des ajouts

Ce script permet de simuler les ajouts jour par jour à partir du fichier `lien.fournisseur` et d'alimenter la base de données avec les doublons et erreurs détectés.

## Utilisation

### En local (avec MongoDB installé)

```bash
cd backend
node scripts/simulateAdditions.js
```

### En production (sur Render)

Le script peut être exécuté directement depuis le serveur en production :

```bash
# Se connecter au serveur via SSH ou utiliser la console Render
cd /app/backend
node scripts/simulateAdditions.js
```

## Fonctionnement

Le script :

1. Lit le fichier `lien.fournisseur` qui contient des URLs organisées par jour
2. Pour chaque URL :
   - Vérifie si le site est supporté (présent dans `SUPPLIERS_CONFIG`)
   - Si le site n'est pas supporté → Enregistre une **erreur**
   - Vérifie si l'URL existe déjà dans la collection `Product`
   - Si l'URL existe déjà → Enregistre un **doublon**
   - Sinon → URL considérée comme nouvelle (mais pas ajoutée dans la simulation)

3. Affiche un résumé avec :
   - Nombre total d'URLs traitées
   - Nombre de nouveaux produits détectés
   - Nombre de doublons détectés
   - Nombre d'erreurs (sites non supportés)
   - Statistiques par jour

## Format du fichier lien.fournisseur

```
Semaine 1
Jour 1 - lundi 20 octobre
https://www.amazon.fr/produit-1
https://www.vevor.fr/produit-2
https://www.cdiscount.com/produit-3

Jour 2 - mardi 21 octobre
https://www.amazon.fr/produit-4
https://www.vevor.fr/produit-5
```

## Résultat

Les doublons et erreurs sont enregistrés dans la collection MongoDB `ignoredproducts` avec :
- `url` : L'URL du produit
- `name` : Le nom du produit (vide pour les erreurs)
- `type` : "doublon" ou "erreur"
- `reason` : La raison ("URL déjà scannée" ou "Site non pris en charge")
- `date` : La date du jour où l'URL a été ajoutée

## Visualisation

Les doublons et erreurs peuvent être consultés via l'interface web en cliquant sur le bouton "🚫 Produits Doublons ou Erreurs" dans l'application.
