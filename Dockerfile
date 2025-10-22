# Utiliser une image Node officielle avec Chromium
FROM node:18-slim

# Installer les dépendances système pour Puppeteer et Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Créer le répertoire de l'application
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste du code
COPY . .

# Variable d'environnement pour Puppeteer (utiliser Chromium système)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Exposer le port (Render définira automatiquement PORT)
EXPOSE 3000

# Démarrer l'application (utilise le script normal car Render a des DNS fonctionnels)
CMD ["npm", "run", "start:prod"]
