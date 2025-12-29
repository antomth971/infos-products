#!/bin/bash

# Script de configuration initiale du serveur VPS
# À exécuter UNE SEULE FOIS lors de la première installation
# Usage: sudo bash setup-server.sh [username]

set -e

echo "🔧 Configuration du serveur VPS..."

# Mettre à jour le système
echo "📦 Mise à jour du système..."
apt-get update
apt-get upgrade -y

# Installer Docker
echo "🐳 Installation de Docker..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Ajouter la clé GPG officielle de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Configurer le dépôt stable
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installer Docker Engine
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io

# Installer Docker Compose
echo "📦 Installation de Docker Compose..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Vérifier l'installation
echo "✅ Vérification de l'installation..."
docker --version
docker-compose --version

# Installer Git (si pas déjà installé)
echo "📚 Installation de Git..."
apt-get install -y git

# Installer des outils utiles
echo "🛠️  Installation d'outils supplémentaires..."
apt-get install -y \
    ufw \
    htop \
    nano \
    vim \
    curl \
    wget \
    unzip

# Configurer le pare-feu (UFW)
echo "🔥 Configuration du pare-feu..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp  # Port de l'application (à modifier selon vos besoins)
echo "y" | ufw enable

# Démarrer Docker au démarrage
systemctl enable docker
systemctl start docker

# Créer un utilisateur non-root pour déployer (optionnel mais recommandé)
if [ "$1" != "" ]; then
    USERNAME=$1
    echo "👤 Création de l'utilisateur: $USERNAME"
    adduser --disabled-password --gecos "" $USERNAME || true
    usermod -aG docker $USERNAME
    echo "$USERNAME ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers.d/$USERNAME
    echo "✅ Utilisateur $USERNAME créé et ajouté au groupe docker"
fi

# Optimiser la configuration pour Puppeteer
echo "🎭 Optimisation pour Puppeteer..."
# Augmenter les limites de mémoire partagée
echo "tmpfs /dev/shm tmpfs defaults,size=2g 0 0" >> /etc/fstab
mount -o remount /dev/shm 2>/dev/null || true

echo ""
echo "✅ Configuration du serveur terminée!"
echo ""
echo "📝 Prochaines étapes:"
echo "1. Clonez votre projet: git clone <votre-repo>"
echo "2. Créez le fichier .env avec vos variables d'environnement"
echo "3. Exécutez: ./deploy.sh"
echo ""
if [ "$1" != "" ]; then
    echo "💡 Pour vous connecter avec le nouvel utilisateur:"
    echo "   su - $USERNAME"
fi
