#!/bin/bash

# Script de déploiement automatique
# Usage: ./deploy.sh

set -e

echo "🚀 Démarrage du déploiement..."

# Vérifier que le fichier .env existe
if [ ! -f .env ]; then
    echo "❌ Erreur: Le fichier .env n'existe pas!"
    echo "📝 Créez un fichier .env basé sur .env.example"
    exit 1
fi

# Charger les variables d'environnement
export $(grep -v '^#' .env | xargs)

echo "📦 Arrêt des conteneurs existants..."
docker-compose down || true

echo "🏗️  Construction de l'image Docker..."
docker-compose build --no-cache

echo "🧹 Nettoyage des anciennes images..."
docker image prune -f

echo "🎬 Démarrage des conteneurs..."
docker-compose up -d

echo "⏳ Attente du démarrage de l'application..."
sleep 10

echo "🔍 Vérification de l'état des conteneurs..."
docker-compose ps

echo "📊 Logs de l'application (les 20 dernières lignes):"
docker-compose logs --tail=20 app

echo ""
echo "✅ Déploiement terminé avec succès!"
echo "🌐 L'application est accessible sur le port configuré"
echo ""
echo "📝 Commandes utiles:"
echo "   - Voir les logs: docker-compose logs -f app"
echo "   - Redémarrer: docker-compose restart"
echo "   - Arrêter: docker-compose down"
echo "   - Statut: docker-compose ps"
