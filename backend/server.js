// Charger les variables d'environnement depuis .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const session = require('express-session');
const Product = require('./models/Product');
const IgnoredProduct = require('./models/IgnoredProduct');
const FacebookToken = require('./models/FacebookToken');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-scraper';

// Codes d'accès (écrits en dur - personnalisables via .env)
const ACCESS_CODE = process.env.ACCESS_CODE || 'ABC12345'; // Code pour accéder au site
const DELETE_CODE = process.env.DELETE_CODE || 'DEL98765'; // Code pour supprimer un produit

// Connexion à MongoDB
mongoose.connect(MONGODB_URI)
.then(() => console.log('✓ Connecté à MongoDB'))
.catch(err => {
  console.error('❌ Erreur de connexion à MongoDB:', err.message);
  console.error('💡 Avez-vous configuré MONGODB_URI dans .env ? Consultez MONGODB_SETUP.md');
  process.exit(1);
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Configuration des sessions (durée de 4h)
app.use(session({
  secret: process.env.SESSION_SECRET || 'votre-secret-super-secret-a-changer',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 4 * 60 * 60 * 1000, // 4 heures en millisecondes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' // HTTPS en production
  }
}));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Configuration des sélecteurs par fournisseur
const SUPPLIERS_CONFIG = {
  '.vevor.': {
    name: 'Vevor',
    requiresPuppeteer: true, // Contenu chargé dynamiquement
    selectors: {
      title: 'h1',
      price: {
        selector: '.DM_co-shopPrice',
        type: 'vevor' // Type spécial pour extraction personnalisée
      },
      description: {
        selector: 'ul.detailGuide_cont li',
        type: 'list'
      },
      images: {
        selector: '.img-normal',
        type: 'img'
      }
    }
  },
  'www.amazon.': {
    name: 'Amazon',
    requiresPuppeteer: true, // Pour charger toutes les images dynamiquement
    selectors: {
      title: 'span#productTitle',
      price: {
        selector: '.a-offscreen',
        type: 'text'
      },
      description: {
        selector: 'div#feature-bullets',
        type: 'textContent'
      },
      images: {
        selector: '.a-dynamic-image',
        type: 'img'
      }
    }
  },
  'www.cdiscount.com': {
    name: 'Cdiscount',
    requiresPuppeteer: false,
    selectors: {
      title: 'h1',
      price: {
        selector: '#DisplayPrice',
        type: 'text'
      },
      description: {
        selector: 'div.c-productHighlights__list',
        type: 'textContent',
        fallback: '#MarketingLongDescription'
      },
      images: {
        selector: '.c-productViewer__controls img',
        type: 'img'
      }
    }
  },
  'www.manomano.fr': {
    name: 'Manomano',
    requiresPuppeteer: true, // Protection anti-bot + contenu dynamique
    selectors: {
      title: 'h1',
      price: {
        selector: '.ETmrsv',
        type: 'text'
      },
      description: {
        selector: 'div.FGeuYs',
        type: 'textContent'
      },
      images: {
        selector: '.Ye1WCg img',
        type: 'img'
      }
    }
  },
  'www.gifi.fr': {
    name: 'Gifi',
    requiresPuppeteer: true, // Contenu chargé dynamiquement
    selectors: {
      title: '.product-name',
      price: {
        selector: '.sr-only',
        type: 'text'
      },
      description: {
        selector: '.product-description',
        type: 'textContent'
      },
      images: {
        selector: '.swiper-wrapper img',
        type: 'img'
      }
    }
  },
  'www.leroymerlin.fr': {
    name: 'Leroy Merlin',
    requiresPuppeteer: true, // Contenu chargé dynamiquement
    selectors: {
      title: 'h1',
      price: {
        selector: '.kl-hidden-accessibility',
        type: 'text'
      },
      description: {
        selector: '#main-characteristics-description',
        type: 'textContent'
      },
      images: {
        selector: '.kl-swiper__slider img',
        type: 'img'
      }
    }
  },
  '.aliexpress.': {
    name: 'AliExpress',
    requiresPuppeteer: true, // Contenu chargé dynamiquement
    selectors: {
      title: 'h1',
      price: {
        selector: '.price-default--current--F8OlYIo',
        type: 'text'
      },
      description: {
        selector: null, // Pas de description
        type: 'empty'
      },
      images: {
        selector: '.slider--slider--VKj5hty img',
        type: 'img'
      }
    }
  },
  'www.bol.com': {
    name: 'Bol.com',
    requiresPuppeteer: true, // Contenu chargé dynamiquement
    selectors: {
      title: 'h1',
      price: {
        selector: '.promo-price',
        type: 'text'
      },
      description: {
        selector: '.product-description',
        type: 'textContent'
      },
      images: {
        selector: null, // Pas d'images scrapables
        type: 'empty'
      }
    }
  }
};

// Fonction pour détecter le fournisseur
function detectSupplier(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    for (const [key, config] of Object.entries(SUPPLIERS_CONFIG)) {
      if (hostname.includes(key) || key.includes(hostname)) {
        return { key, config };
      }
    }
    return null;
  } catch (error) {
    console.error('Erreur lors de la détection du fournisseur:', error.message);
    return null;
  }
}

// Fonction pour extraire le titre
function extractTitle($, selectors) {
  const title = $(selectors.title).first().text().trim();
  console.log('🔍 Titre trouvé:', title ? `Oui (${title.substring(0, 50)}...)` : 'Non');
  return title;
}

// Fonction pour extraire le prix
function extractPrice($, priceConfig) {
  let price = '';

  if (priceConfig.type === 'vevor') {
    // Logique spéciale pour Vevor - utiliser data-currency
    const priceElement = $(priceConfig.selector).first();
    console.log('🔍 Vevor - Élément trouvé:', priceElement.length > 0);

    if (priceElement.length > 0) {
      const dataCurrency = priceElement.attr('data-currency');
      console.log('🔍 Vevor - data-currency:', dataCurrency);

      if (dataCurrency) {
        // Remplacer le point par une virgule pour le format européen
        const formattedPrice = dataCurrency.replace('.', ',');
        price = `${formattedPrice} €`;
        console.log('✓ Vevor - Prix extrait:', price);
      } else {
        console.log('❌ Vevor - data-currency non trouvé');
      }
    } else {
      console.log('❌ Vevor - Élément .DM_co-shopPrice non trouvé');
    }
  } else if (priceConfig.type === 'text') {
    // Extraction simple du texte
    const priceElement = $(priceConfig.selector).first();
    console.log('🔍 Prix - Élément trouvé:', priceElement.length > 0);
    console.log('🔍 Prix - Nombre d\'éléments:', $(priceConfig.selector).length);

    if (priceElement.length > 0) {
      price = priceElement.text().trim();
      console.log('🔍 Prix extrait:', price ? `"${price}"` : '(vide)');
    } else {
      console.log('❌ Prix - Aucun élément trouvé avec le sélecteur:', priceConfig.selector);
    }
  }

  return price;
}

// Fonction pour extraire la description
function extractDescription($, descConfig) {
  const description = [];

  // Si pas de description (AliExpress, etc.)
  if (descConfig.type === 'empty' || !descConfig.selector) {
    console.log('ℹ️ Pas de description pour ce fournisseur');
    return description;
  }

  if (descConfig.type === 'list') {
    // Pour les listes (ul > li)
    $(descConfig.selector).each((i, elem) => {
      const text = $(elem).text().trim();
      if (text) {
        description.push(text);
      }
    });
  } else if (descConfig.type === 'textContent') {
    // Pour le textContent d'une div
    let text = $(descConfig.selector).first().text().trim();
    console.log('🔍 Description principale trouvée:', text ? 'Oui' : 'Non', '(longueur:', text.length, ')');

    // Si vide et qu'il y a un fallback, essayer le fallback
    if (!text && descConfig.fallback) {
      console.log('⚠️ Description vide, utilisation du fallback:', descConfig.fallback);
      const fallbackElement = $(descConfig.fallback).first();
      console.log('🔍 Élément fallback trouvé:', fallbackElement.length > 0);
      text = fallbackElement.text().trim();
      console.log('🔍 Texte fallback (longueur:', text.length, ')');
    }

    if (text) {
      // Diviser par lignes ou puces si nécessaire
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      description.push(...lines);
    } else {
      console.log('❌ Aucune description trouvée (principal + fallback)');
    }
  }

  return description;
}

// Fonction pour extraire les images en haute résolution
function extractImages($, imgConfig, baseUrl) {
  const images = [];

  // Si pas d'images (Bol.com, etc.)
  if (imgConfig.type === 'empty' || !imgConfig.selector) {
    console.log('ℹ️ Pas d\'images pour ce fournisseur');
    return images;
  }

  if (imgConfig.type === 'img') {
    const allElements = $(imgConfig.selector);
    console.log('🔍 Images - Nombre d\'éléments img trouvés:', allElements.length);

    $(imgConfig.selector).each((i, elem) => {
      let src = null;

      // Pour Amazon : chercher la meilleure qualité dans data-a-dynamic-image
      if (baseUrl.includes('amazon')) {
        console.log(`\n🔍 Amazon - Image ${i + 1}:`);

        const dynamicImage = $(elem).attr('data-a-dynamic-image');
        const dataOldHires = $(elem).attr('data-old-hires');
        const dataLargeImage = $(elem).attr('data-large-image');
        const srcAttr = $(elem).attr('src');

        console.log('  - data-a-dynamic-image:', dynamicImage ? 'Présent' : 'Absent');
        console.log('  - data-old-hires:', dataOldHires ? dataOldHires.substring(0, 80) + '...' : 'Absent');
        console.log('  - data-large-image:', dataLargeImage ? dataLargeImage.substring(0, 80) + '...' : 'Absent');
        console.log('  - src:', srcAttr ? srcAttr.substring(0, 80) + '...' : 'Absent');

        if (dynamicImage) {
          try {
            // data-a-dynamic-image contient un JSON avec URLs et dimensions
            const imageData = JSON.parse(dynamicImage);
            // Trier par taille (largeur * hauteur) et prendre la plus grande
            const sortedImages = Object.entries(imageData).sort((a, b) => {
              const sizeA = a[1][0] * a[1][1]; // largeur * hauteur
              const sizeB = b[1][0] * b[1][1];
              return sizeB - sizeA; // Ordre décroissant
            });
            if (sortedImages.length > 0) {
              src = sortedImages[0][0]; // URL de la plus grande image
              console.log('  ✓ Image HD sélectionnée:', sortedImages[0][1], 'pixels');
              console.log('  ✓ URL:', src.substring(0, 100) + '...');
            }
          } catch (error) {
            console.log('  ⚠️ Erreur parsing data-a-dynamic-image:', error.message);
          }
        }

        // Fallback Amazon
        if (!src) {
          src = dataOldHires || dataLargeImage;
          if (src) {
            console.log('  ✓ Fallback utilisé:', dataOldHires ? 'data-old-hires' : 'data-large-image');
          }
        }
      }

      // Pour les autres sites ou fallback
      if (!src) {
        src = $(elem).attr('data-large-image') ||  // Haute résolution
              $(elem).attr('data-original') ||      // Vevor/autres
              $(elem).attr('data-zoom-image') ||    // Images zoomables
              $(elem).attr('data-lazy-src') ||      // Lazy loading
              $(elem).attr('data-src') ||           // Lazy loading alternatif
              $(elem).attr('src');                  // Fallback standard
      }

      if (src) {
        // Nettoyer l'URL pour obtenir la meilleure qualité
        src = cleanImageUrl(src);

        // Si l'URL est relative, la rendre absolue
        const absoluteUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
        images.push(absoluteUrl);
      }
    });

    console.log('✓ Images - Nombre d\'images extraites:', images.length);
  }

  return images;
}

// Fonction pour nettoyer les URLs d'images et obtenir la haute résolution
function cleanImageUrl(url) {
  // Amazon : Supprimer TOUS les paramètres de redimensionnement
  if (url.includes('amazon')) {
    // Retirer ._SX300_. ._SY300_. ._AC_SX300_. etc.
    url = url.replace(/\._[A-Z]{2}\d+_\./g, '.');
    url = url.replace(/\._AC_[A-Z]{2,4}\d+_\./g, '.');
    url = url.replace(/\._[A-Z]{2,4}\d+,\d+_\./g, '.');
    // Retirer _AC_UL/US suivi de chiffres
    url = url.replace(/\._AC_U[LS]\d+_\./g, '.');
    // Nettoyer les doubles points
    url = url.replace(/\.{2,}/g, '.');
  }

  // Vevor : Remplacer les tailles moyennes par grande
  if (url.includes('vevor')) {
    url = url.replace(/_medium\./, '_large.');
    url = url.replace(/_small\./, '_large.');
    url = url.replace(/\/\d+x\d+\//, '/original/'); // Remplace /300x300/ par /original/
  }

  // Cdiscount : Obtenir la plus grande version
  if (url.includes('cdiscount')) {
    url = url.replace(/\/[a-z]\//, '/f/'); // Remplace /m/ (medium) par /f/ (full)
  }

  // Manomano : Supprimer les paramètres de taille
  if (url.includes('manomano')) {
    url = url.replace(/\?.*$/, ''); // Retire tous les paramètres
  }

  // Leroy Merlin : Obtenir la version haute résolution
  if (url.includes('leroymerlin')) {
    // Supprimer les paramètres de redimensionnement
    url = url.replace(/\?.*$/, ''); // Retire tous les paramètres
  }

  // Gifi : Supprimer les paramètres de taille
  if (url.includes('gifi')) {
    url = url.replace(/\?.*$/, ''); // Retire tous les paramètres
  }

  // AliExpress : Supprimer les paramètres de taille
  if (url.includes('aliexpress')) {
    url = url.replace(/\?.*$/, ''); // Retire tous les paramètres
    // Remplacer les dimensions dans l'URL
    url = url.replace(/_\d+x\d+\./, '.'); // Retire _50x50. _200x200. etc.
  }

  return url;
}

// ===== Routes d'authentification =====

// Vérifier si l'utilisateur est connecté
app.get('/api/auth/check', (req, res) => {
  res.json({
    authenticated: req.session.authenticated === true
  });
});

// Route de connexion (vérifier le code d'accès)
app.post('/api/auth/login', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      error: 'Code requis'
    });
  }

  if (code === ACCESS_CODE) {
    req.session.authenticated = true;
    return res.json({
      success: true,
      message: 'Accès autorisé'
    });
  } else {
    return res.status(401).json({
      success: false,
      error: 'Code invalide'
    });
  }
});

// Route de déconnexion
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Erreur lors de la déconnexion'
      });
    }
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
  });
});

// ===== Fin des routes d'authentification =====

// Fonction pour récupérer le HTML avec Puppeteer (pour contourner les protections anti-bot)
async function fetchWithPuppeteer(url) {
  let browser;
  try {
    console.log('Utilisation de Puppeteer pour contourner la protection anti-bot...');

    // Détecter le site pour des stratégies spéciales
    const isLeroyMerlin = url.includes('leroymerlin');
    const isAmazon = url.includes('amazon');

    // Configuration pour l'environnement de production
    const puppeteerConfig = {
      headless: isLeroyMerlin ? false : 'new', // Mode visible pour Leroy Merlin
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled', // Masquer l'automatisation
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    };

    // En production (Render), utiliser le chemin Chromium système
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    browser = await puppeteer.launch(puppeteerConfig);

    const page = await browser.newPage();

    // Masquer les traces de Puppeteer
    await page.evaluateOnNewDocument(() => {
      // Supprimer les indicateurs de webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });

      // Masquer les propriétés de Chrome automation
      window.chrome = {
        runtime: {},
      };

      // Masquer les permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // Définir un user agent réaliste
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Définir la taille de la fenêtre
    await page.setViewport({ width: 1920, height: 1080 });

    // Naviguer vers la page avec une stratégie plus permissive
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded', // Plus rapide que networkidle2
        timeout: 45000
      });
    } catch (error) {
      console.log('⚠️ Timeout initial, tentative avec load...');
      await page.goto(url, {
        waitUntil: 'load',
        timeout: 45000
      });
    }

    // Attendre que le contenu dynamique se charge
    console.log('⏳ Attente du chargement du contenu JavaScript...');

    // Simuler des interactions utilisateur pour éviter la détection anti-bot
    await page.mouse.move(100, 100);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.mouse.move(200, 200);

    // Attendre plus longtemps pour Leroy Merlin (challenge anti-bot)
    const waitTime = isLeroyMerlin ? 15000 : 8000;
    console.log(`⏳ Attente de ${waitTime/1000} secondes...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Attendre que des éléments clés soient visibles (si possible)
    try {
      // Attendre qu'au moins un des sélecteurs communs soit présent
      const selectorTimeout = isLeroyMerlin ? 30000 : 15000;
      await page.waitForSelector('h1, .product-name, img, body', { timeout: selectorTimeout });
      console.log('✓ Éléments chargés');
    } catch (waitError) {
      console.log('⚠️ Timeout en attendant les éléments, continuons quand même...');
    }

    // Logique spéciale pour Amazon : cliquer sur les miniatures pour charger toutes les images
    if (isAmazon) {
      try {
        console.log('🖱️ Amazon - Chargement de toutes les images...');

        // Attendre que les miniatures soient présentes
        await page.waitForSelector('#altImages li.imageThumbnail', { timeout: 10000 });

        // Récupérer toutes les miniatures
        const thumbnails = await page.$$('#altImages li.imageThumbnail');
        console.log(`✓ Amazon - ${thumbnails.length} miniatures trouvées`);

        // Cliquer sur chaque miniature pour charger l'image
        for (let i = 0; i < thumbnails.length && i < 10; i++) { // Limiter à 10 images max
          try {
            await thumbnails[i].click();
            await new Promise(resolve => setTimeout(resolve, 500)); // Attendre 500ms entre chaque clic
          } catch (clickError) {
            console.log(`⚠️ Erreur clic miniature ${i + 1}`);
          }
        }

        console.log('✓ Amazon - Toutes les images chargées');
      } catch (error) {
        console.log('⚠️ Amazon - Impossible de charger toutes les miniatures:', error.message);
      }
    }

    // Attendre encore un peu après le chargement des éléments
    const finalWait = isLeroyMerlin ? 5000 : (isAmazon ? 2000 : 2000);
    await new Promise(resolve => setTimeout(resolve, finalWait));

    // Récupérer le HTML
    const html = await page.content();

    // Debug: Sauvegarder un aperçu du HTML pour Leroy Merlin
    if (url.includes('leroymerlin')) {
      console.log('📄 Aperçu HTML (premiers 500 caractères):');
      console.log(html.substring(0, 500));
      console.log('\n📄 Recherche de h1 dans le HTML:', html.includes('<h1') ? 'Trouvé' : 'Non trouvé');
      console.log('📄 Recherche de kl-hidden-accessibility:', html.includes('kl-hidden-accessibility') ? 'Trouvé' : 'Non trouvé');
      console.log('📄 Recherche de kl-swiper__slider:', html.includes('kl-swiper__slider') ? 'Trouvé' : 'Non trouvé');
      console.log('📄 Taille totale du HTML:', html.length, 'caractères');
    }

    return html;

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Endpoint pour scraper une page
app.post('/api/scrape', async (req, res) => {
  try {
    const { url, customDate } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL est requis' });
    }

    // Utiliser la date personnalisée si fournie, sinon la date actuelle
    let productDate;
    if (customDate) {
      // Parser la date en format YYYY-MM-DD et forcer l'heure à minuit (00:00:00) en temps local
      const [year, month, day] = customDate.split('-').map(Number);
      productDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      console.log(`📅 Utilisation de la date personnalisée: ${productDate.toLocaleDateString('fr-FR')}`);
    } else {
      productDate = new Date();
    }

    // Détecter le fournisseur
    const supplier = detectSupplier(url);
    if (!supplier) {
      // Enregistrer l'erreur (site non pris en charge)
      const existingError = await IgnoredProduct.findOne({ url, type: 'erreur' });
      if (!existingError) {
        await IgnoredProduct.create({
          url: url,
          name: '',
          type: 'erreur',
          reason: 'Site non pris en charge',
          date: productDate
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Site non pris en charge, vérifier l\'URL'
      });
    }

    console.log(`Fournisseur détecté: ${supplier.config.name}`);

    // Vérifier si l'URL a déjà été scannée
    const existingProduct = await Product.findOne({ url });
    if (existingProduct) {
      // Enregistrer le doublon
      const existingDuplicate = await IgnoredProduct.findOne({ url, type: 'doublon' });
      if (!existingDuplicate) {
        await IgnoredProduct.create({
          url: url,
          name: existingProduct.name,
          type: 'doublon',
          reason: 'URL déjà scannée',
          date: productDate
        });
      }

      return res.status(409).json({
        success: false,
        error: 'URL déjà scannée',
        alreadyScanned: true
      });
    }

    // Récupérer le contenu de la page
    let html;
    let usedPuppeteer = false;

    // Vérifier si le fournisseur nécessite Puppeteer
    if (supplier.config.requiresPuppeteer) {
      console.log(`⚡ ${supplier.config.name} nécessite Puppeteer (contenu dynamique)...`);
      html = await fetchWithPuppeteer(url);
      usedPuppeteer = true;
      console.log('✓ Récupération réussie avec Puppeteer');
    } else {
      // Essayer d'abord axios, puis puppeteer si 403
      try {
        console.log('Tentative de récupération avec axios...');
        const response = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
          },
          timeout: 15000,
          maxRedirects: 5
        });
        html = response.data;
        console.log('✓ Récupération réussie avec axios');
      } catch (axiosError) {
        // Si c'est une erreur 403, essayer avec puppeteer
        if (axiosError.response && axiosError.response.status === 403) {
          console.log('❌ Erreur 403 avec axios, utilisation de Puppeteer...');
          html = await fetchWithPuppeteer(url);
          usedPuppeteer = true;
          console.log('✓ Récupération réussie avec Puppeteer');
        } else {
          // Pour les autres erreurs, les propager
          throw axiosError;
        }
      }
    }

    const $ = cheerio.load(html);

    // Extraire les données en utilisant la configuration du fournisseur
    const selectors = supplier.config.selectors;

    const title = extractTitle($, selectors);
    const price = extractPrice($, selectors.price);
    const description = extractDescription($, selectors.description);
    const images = extractImages($, selectors.images, url);

    console.log('Données extraites:');
    console.log('- Fournisseur:', supplier.config.name);
    console.log('- Titre:', title);
    console.log('- Prix:', price);
    console.log('- Description:', description.length, 'éléments');
    console.log('- Images:', images.length, 'trouvées');

    // Ajouter à la base de données
    const newProduct = new Product({
      name: title,
      price: price || 'indispo',
      description: description,
      images: images,
      url: url,
      supplier: supplier.config.name,
      createdAt: productDate
    });

    await newProduct.save();
    console.log(`✅ Produit sauvegardé avec la date: ${newProduct.createdAt.toLocaleDateString('fr-FR')}`);

    // Retourner les données extraites
    res.json({
      success: true,
      data: {
        id: newProduct._id,
        ...newProduct.toObject()
      },
      usedPuppeteer: usedPuppeteer
    });

  } catch (error) {
    console.error('Erreur lors du scraping:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du scraping de la page',
      details: error.message
    });
  }
});

// Récupérer tous les items
app.get('/api/items', async (req, res) => {
  try {
    const items = await Product.find().sort({ createdAt: 1 });
    res.json({
      success: true,
      data: items.map(item => ({
        id: item._id,
        ...item.toObject()
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des items:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des items'
    });
  }
});

// Supprimer un item (nécessite le code de suppression)
app.delete('/api/items/:id', async (req, res) => {
  try {
    // Vérifier si l'utilisateur est connecté
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    // Vérifier le code de suppression
    const { deleteCode } = req.body;

    if (!deleteCode) {
      return res.status(400).json({
        success: false,
        error: 'Code de suppression requis'
      });
    }

    if (deleteCode !== DELETE_CODE) {
      return res.status(401).json({
        success: false,
        error: 'Code de suppression invalide'
      });
    }

    // Si tout est OK, supprimer le produit
    const id = req.params.id;
    await Product.findByIdAndDelete(id);
    const items = await Product.find().sort({ createdAt: 1 });
    res.json({
      success: true,
      data: items.map(item => ({
        id: item._id,
        ...item.toObject()
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression'
    });
  }
});

// Export Excel
app.get('/api/export/excel', async (req, res) => {
  try {
    const items = await Product.find().sort({ createdAt: 1 });

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucune donnée à exporter'
      });
    }

    // Préparer les données pour Excel
    const excelData = items.map(item => ({
      'ID': item._id.toString(),
      'Fournisseur': item.supplier || 'N/A',
      'Nom': item.name || '',
      'Prix': item.price || '',
      'Description': item.description ? item.description.join(' | ') : '',
      'Nombre d\'images': item.images ? item.images.length : 0,
      'Liens des images': item.images ? item.images.join(' | ') : '',
      'URL Source': item.url || '',
      'Date de création': item.createdAt ? new Date(item.createdAt).toISOString() : ''
    }));

    // Créer un workbook et une worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Ajuster la largeur des colonnes
    const columnWidths = [
      { wch: 5 },   // ID
      { wch: 15 },  // Fournisseur
      { wch: 40 },  // Nom
      { wch: 15 },  // Prix
      { wch: 60 },  // Description
      { wch: 15 },  // Nombre d'images
      { wch: 80 },  // Liens des images
      { wch: 50 },  // URL Source
      { wch: 20 }   // Date de création
    ];
    worksheet['!cols'] = columnWidths;

    // Ajouter la worksheet au workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produits scrapés');

    // Générer le fichier Excel en buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Définir le nom du fichier avec la date
    const date = new Date().toISOString().split('T')[0];
    const filename = `export_produits_${date}.xlsx`;

    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Erreur lors de l\'export Excel:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'export Excel',
      details: error.message
    });
  }
});


// // Export Excel
// app.get('/api/export/excel', async (req, res) => {
//   try {
//     const items = await db.getAll();

//     if (items.length === 0) {
//       return res.status(404).json({
//         success: false,
//         error: 'Aucune donnée à exporter'
//       });
//     }

//     // Préparer les données pour Excel
//     const excelData = items.map(item => ({
//       'ID': item.id,
//       'Nom': item.name || '',
//       'Prix': item.price || '',
//       'Description': item.description ? item.description.join(' | ') : '',
//       'Nombre d\'images': item.images ? item.images.length : 0,
//       'URL Source': item.url || '',
//       'Date de création': item.createdAt || ''
//     }));

//     // Créer un workbook et une worksheet
//     const workbook = XLSX.utils.book_new();
//     const worksheet = XLSX.utils.json_to_sheet(excelData);

//     // Ajuster la largeur des colonnes
//     const columnWidths = [
//       { wch: 5 },   // ID
//       { wch: 40 },  // Nom
//       { wch: 15 },  // Prix
//       { wch: 60 },  // Description
//       { wch: 15 },  // Nombre d'images
//       { wch: 50 },  // URL Source
//       { wch: 20 }   // Date de création
//     ];
//     worksheet['!cols'] = columnWidths;

//     // Ajouter la worksheet au workbook
//     XLSX.utils.book_append_sheet(workbook, worksheet, 'Produits scrapés');

//     // Générer le fichier Excel en buffer
//     const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

//     // Définir le nom du fichier avec la date
//     const date = new Date().toISOString().split('T')[0];
//     const filename = `export_produits_${date}.xlsx`;

//     // Envoyer le fichier
//     res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
//     res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
//     res.send(excelBuffer);

//   } catch (error) {
//     console.error('Erreur lors de l\'export Excel:', error.message);
//     res.status(500).json({
//       success: false,
//       error: 'Erreur lors de l\'export Excel',
//       details: error.message
//     });
//   }
// });

// Proxy pour télécharger les images (contourner CORS)
app.post('/api/download-image', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL est requis' });
    }

    // Télécharger l'image via le backend
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(url).origin
      },
      timeout: 15000
    });

    // Détecter le type MIME
    const contentType = response.headers['content-type'] || 'image/jpeg';

    // Renvoyer l'image
    res.set('Content-Type', contentType);
    res.send(Buffer.from(response.data));

  } catch (error) {
    console.error('Erreur lors du téléchargement de l\'image:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du téléchargement de l\'image'
    });
  }
});

// Endpoint pour traiter plusieurs URLs en lot (traitement backend en arrière-plan)
app.post('/api/scrape-batch', async (req, res) => {
  try {
    const { urls, customDate } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Un tableau d\'URLs est requis'
      });
    }

    // Répondre immédiatement au client
    res.json({
      success: true,
      message: `Traitement de ${urls.length} URL(s) démarré en arrière-plan`,
      totalUrls: urls.length
    });

    // Traiter les URLs en arrière-plan (sans bloquer la réponse)
    processBatchInBackground(urls, customDate);

  } catch (error) {
    console.error('Erreur lors du démarrage du traitement en lot:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du démarrage du traitement'
    });
  }
});

// Fonction pour traiter les URLs en arrière-plan
async function processBatchInBackground(urls, customDate) {
  // Utiliser la date personnalisée si fournie, sinon la date actuelle
  let productDate;
  if (customDate) {
    // Parser la date en format YYYY-MM-DD et forcer l'heure à minuit (00:00:00) en temps local
    const [year, month, day] = customDate.split('-').map(Number);
    productDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    console.log(`📅 Utilisation de la date personnalisée: ${productDate.toLocaleDateString('fr-FR')}`);
  } else {
    productDate = new Date();
  }

  const results = {
    startTime: new Date().toISOString(),
    totalUrls: urls.length,
    processed: 0,
    added: 0,
    skipped: 0,
    errors: 0,
    details: {
      added: [],
      skipped: [],
      errors: []
    }
  };

  console.log(`\n🚀 Démarrage du traitement en lot de ${urls.length} URL(s)...`);
  if (customDate) {
    console.log(`📅 Date personnalisée: ${productDate.toLocaleDateString('fr-FR')}`);
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i].trim();
    console.log(`\n[${i + 1}/${urls.length}] Traitement de: ${url}`);

    try {
      // Détecter le fournisseur
      const supplier = detectSupplier(url);
      if (!supplier) {
        // Enregistrer l'erreur (site non pris en charge)
        const existingError = await IgnoredProduct.findOne({ url, type: 'erreur' });
        if (!existingError) {
          await IgnoredProduct.create({
            url: url,
            name: '',
            type: 'erreur',
            reason: 'Site non pris en charge',
            date: productDate
          });
        }

        results.errors++;
        results.details.errors.push({
          url,
          error: 'Site non pris en charge'
        });
        results.processed++;
        continue;
      }

      console.log(`Fournisseur détecté: ${supplier.config.name}`);

      // Vérifier si l'URL a déjà été scannée
      const existingProduct = await Product.findOne({ url });
      if (existingProduct) {
        console.log('⚠️ URL déjà scannée, ignorée');

        // Enregistrer le doublon
        const existingDuplicate = await IgnoredProduct.findOne({ url, type: 'doublon' });
        if (!existingDuplicate) {
          await IgnoredProduct.create({
            url: url,
            name: existingProduct.name,
            type: 'doublon',
            reason: 'URL déjà scannée',
            date: productDate
          });
        }

        results.skipped++;
        results.details.skipped.push({
          url,
          reason: 'Déjà scannée'
        });
        results.processed++;
        continue;
      }

      // Récupérer le contenu de la page
      let html;
      let usedPuppeteer = false;

      if (supplier.config.requiresPuppeteer) {
        console.log(`⚡ ${supplier.config.name} nécessite Puppeteer...`);
        html = await fetchWithPuppeteer(url);
        usedPuppeteer = true;
      } else {
        try {
          console.log('Tentative avec axios...');
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
              'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7'
            },
            timeout: 15000,
            maxRedirects: 5
          });
          html = response.data;
        } catch (axiosError) {
          if (axiosError.response && axiosError.response.status === 403) {
            console.log('❌ Erreur 403, utilisation de Puppeteer...');
            html = await fetchWithPuppeteer(url);
            usedPuppeteer = true;
          } else {
            throw axiosError;
          }
        }
      }

      const $ = cheerio.load(html);

      // Extraire les données
      const selectors = supplier.config.selectors;
      const title = extractTitle($, selectors);
      const price = extractPrice($, selectors.price);
      const description = extractDescription($, selectors.description);
      const images = extractImages($, selectors.images, url);

      console.log('✓ Données extraites:', title);

      // Sauvegarder dans MongoDB
      const newProduct = new Product({
        name: title,
        price: price || 'indispo',
        description: description,
        images: images,
        url: url,
        supplier: supplier.config.name,
        createdAt: productDate
      });

      await newProduct.save();

      results.added++;
      results.details.added.push({
        url,
        title,
        supplier: supplier.config.name,
        usedPuppeteer
      });

      console.log(`✅ [${i + 1}/${urls.length}] Produit ajouté avec succès`);

    } catch (error) {
      console.error(`❌ [${i + 1}/${urls.length}] Erreur:`, error.message);
      results.errors++;
      results.details.errors.push({
        url,
        error: error.message
      });
    }

    results.processed++;

    // Petit délai pour ne pas surcharger
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  results.endTime = new Date().toISOString();

  // Calculer la durée
  const startTime = new Date(results.startTime);
  const endTime = new Date(results.endTime);
  const durationMs = endTime - startTime;
  const durationSec = Math.floor(durationMs / 1000);
  results.duration = `${durationSec}s`;

  console.log('\n✅ Traitement en lot terminé !');
  console.log(`   - Ajoutés: ${results.added}`);
  console.log(`   - Ignorés: ${results.skipped}`);
  console.log(`   - Erreurs: ${results.errors}`);
  console.log(`   - Durée: ${results.duration}`);

  // Sauvegarder les résultats dans un fichier JSON
  try {
    const resultsDir = path.join(__dirname, 'public');
    if (!fsSync.existsSync(resultsDir)) {
      fsSync.mkdirSync(resultsDir, { recursive: true });
    }

    const resultsPath = path.join(resultsDir, 'batch-results.json');
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`📄 Résultats enregistrés dans ${resultsPath}`);
  } catch (error) {
    console.error('❌ Erreur lors de l\'enregistrement des résultats:', error);
  }
}

// Endpoint pour afficher les résultats du dernier traitement en lot
app.get('/results', async (req, res) => {
  try {
    const resultsPath = path.join(__dirname, 'public', 'batch-results.json');

    // Vérifier si le fichier existe
    if (!fsSync.existsSync(resultsPath)) {
      return res.status(404).json({
        error: 'Aucun résultat de traitement en lot disponible'
      });
    }

    // Lire et renvoyer le fichier JSON
    const results = await fs.readFile(resultsPath, 'utf8');
    const data = JSON.parse(results);

    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la lecture des résultats:', error);
    res.status(500).json({
      error: 'Erreur lors de la lecture des résultats'
    });
  }
});

// Endpoint pour rechercher sur DuckDuckGo et trouver un lien Vevor
app.post('/api/search-vevor', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query est requis'
      });
    }

    console.log(`🔍 Recherche DuckDuckGo pour: "${query}"`);

    // Utiliser DuckDuckGo HTML avec paramètres français
    // kl=fr-fr : Région française
    // kp=-2 : Désactiver le filtre parental strict
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=fr-fr`;

    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const linksSet = new Set(); // Utiliser un Set pour éviter les doublons automatiquement

    // Fonction pour normaliser les URLs et éviter les doublons
    const normalizeUrl = (url) => {
      try {
        let normalized = url.toLowerCase().trim();
        // Supprimer les paramètres de tracking courants
        normalized = normalized.split('?')[0].split('#')[0];
        // Supprimer le trailing slash
        normalized = normalized.replace(/\/$/, '');
        // Normaliser www
        normalized = normalized.replace(/^https?:\/\/(www\.)?/, 'https://');
        return normalized;
      } catch (e) {
        return url;
      }
    };

    // DuckDuckGo HTML utilise des sélecteurs simples
    $('.result__a').each((_, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        // DuckDuckGo utilise des redirections, extraire l'URL réelle
        try {
          const urlMatch = href.match(/uddg=([^&]+)/);
          if (urlMatch) {
            const actualUrl = decodeURIComponent(urlMatch[1]);
            if (actualUrl.startsWith('http') &&
                !actualUrl.includes('duckduckgo.com') &&
                !actualUrl.includes('youtube.com')) {
              linksSet.add(normalizeUrl(actualUrl));
            }
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
    });

    // Méthode alternative : liens directs
    $('.result__url').each((_, elem) => {
      const text = $(elem).text().trim();
      if (text && text.startsWith('http')) {
        if (!text.includes('duckduckgo.com') &&
            !text.includes('youtube.com')) {
          linksSet.add(normalizeUrl(text));
        }
      }
    });

    // Convertir le Set en Array
    const links = Array.from(linksSet);

    console.log(`📊 ${links.length} liens trouvés`);

    if (links.length > 0) {
      console.log('🔗 Premiers liens:');
      links.slice(0, 5).forEach((link, i) => {
        console.log(`   ${i + 1}. ${link}`);
      });
    }

    // Chercher un lien avec "vevor" DANS LE DOMAINE (pas juste dans l'URL)
    const vevorLink = links.slice(0, 10).find(link => {
      try {
        const url = new URL(link);
        const hostname = url.hostname.toLowerCase();
        // Vérifier que "vevor" est dans le nom de domaine
        return hostname.includes('vevor');
      } catch (e) {
        return false;
      }
    });

    if (vevorLink) {
      console.log(`✅ Lien Vevor officiel trouvé: ${vevorLink}`);
      return res.json({
        success: true,
        url: vevorLink
      });
    } else if (links.length > 0) {
      // Si aucun lien Vevor trouvé mais qu'il y a des liens, prendre le premier
      console.log(`⚠️ Aucun domaine Vevor trouvé, utilisation du premier résultat: ${links[0]}`);
      return res.json({
        success: true,
        url: links[0]
      });
    } else {
      console.log('❌ Aucun lien trouvé dans les résultats de recherche');
      return res.json({
        success: false,
        error: 'Aucun lien trouvé pour ce produit'
      });
    }

  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recherche',
      details: error.message
    });
  }
});

// ===== Routes pour les produits ignorés (doublons/erreurs) =====

// Récupérer les dates disponibles pour un type (doublon ou erreur)
app.get('/api/ignored/:type/dates', async (req, res) => {
  try {
    const { type } = req.params;

    if (type !== 'doublon' && type !== 'erreur') {
      return res.status(400).json({
        success: false,
        error: 'Type invalide. Utilisez "doublon" ou "erreur"'
      });
    }

    // Récupérer toutes les dates uniques pour ce type
    const dates = await IgnoredProduct.aggregate([
      { $match: { type: type } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    res.json({
      success: true,
      data: dates.map(item => ({
        date: item._id,
        count: item.count
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des dates:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des dates'
    });
  }
});

// Récupérer les produits ignorés pour une date et un type spécifiques
app.get('/api/ignored/:type/by-date/:date', async (req, res) => {
  try {
    const { type, date } = req.params;

    if (type !== 'doublon' && type !== 'erreur') {
      return res.status(400).json({
        success: false,
        error: 'Type invalide. Utilisez "doublon" ou "erreur"'
      });
    }

    // Convertir la date string en Date
    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const items = await IgnoredProduct.find({
      type: type,
      date: {
        $gte: startDate,
        $lt: endDate
      }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: items.map(item => ({
        id: item._id,
        url: item.url,
        name: item.name,
        reason: item.reason,
        date: item.date
      }))
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des produits ignorés:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des produits ignorés'
    });
  }
});

// Récupérer les statistiques générales
app.get('/api/ignored/stats', async (req, res) => {
  try {
    const totalDuplicates = await IgnoredProduct.countDocuments({ type: 'doublon' });
    const totalErrors = await IgnoredProduct.countDocuments({ type: 'erreur' });

    res.json({
      success: true,
      data: {
        duplicates: totalDuplicates,
        errors: totalErrors,
        total: totalDuplicates + totalErrors
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
});

// ===== Fin des routes pour les produits ignorés =====

// ===== Routes pour Facebook Marketplace =====

// Variables Facebook
const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const FACEBOOK_CALLBACK_URL = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:3000/api/facebook/callback';
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;

// 1. Vérifier le statut de connexion Facebook
app.get('/api/facebook/status', async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    // Vérifier si on a un token Facebook stocké
    const token = await FacebookToken.findOne({});

    res.json({
      success: true,
      connected: !!token,
      pageId: token ? token.pageId : null
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du statut Facebook:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification du statut'
    });
  }
});

// 2. Démarrer le processus OAuth Facebook
app.get('/api/facebook/login', (req, res) => {
  if (!req.session.authenticated) {
    return res.status(403).json({
      success: false,
      error: 'Accès non autorisé. Veuillez vous connecter.'
    });
  }

  // Permissions nécessaires pour Marketplace
  const permissions = [
    'pages_manage_posts',
    'pages_read_engagement',
    'catalog_management',
    'business_management'
  ].join(',');

  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
    `client_id=${FACEBOOK_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(FACEBOOK_CALLBACK_URL)}` +
    `&scope=${permissions}` +
    `&response_type=code`;

  res.json({
    success: true,
    authUrl: authUrl
  });
});

// 3. Callback OAuth Facebook
app.get('/api/facebook/callback', async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect('/facebook-marketplace.html?error=no_code');
    }

    // Échanger le code contre un access token
    const tokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        redirect_uri: FACEBOOK_CALLBACK_URL,
        code: code
      }
    });

    const userAccessToken = tokenResponse.data.access_token;

    // Obtenir un token de longue durée (60 jours)
    const longTokenResponse = await axios.get(`https://graph.facebook.com/v18.0/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: FACEBOOK_APP_ID,
        client_secret: FACEBOOK_APP_SECRET,
        fb_exchange_token: userAccessToken
      }
    });

    const longLivedToken = longTokenResponse.data.access_token;

    // Obtenir l'ID utilisateur
    const meResponse = await axios.get(`https://graph.facebook.com/v18.0/me`, {
      params: {
        access_token: longLivedToken
      }
    });

    const userId = meResponse.data.id;

    // Obtenir le Page Access Token (ne expire jamais si la page est active)
    const pagesResponse = await axios.get(`https://graph.facebook.com/v18.0/${userId}/accounts`, {
      params: {
        access_token: longLivedToken
      }
    });

    // Trouver la page configurée ou prendre la première
    let pageData = pagesResponse.data.data.find(page => page.id === FACEBOOK_PAGE_ID);
    if (!pageData && pagesResponse.data.data.length > 0) {
      pageData = pagesResponse.data.data[0]; // Prendre la première page par défaut
    }

    if (!pageData) {
      return res.redirect('/facebook-marketplace.html?error=no_page');
    }

    // Sauvegarder le token dans MongoDB
    await FacebookToken.findOneAndUpdate(
      { userId: userId },
      {
        userId: userId,
        accessToken: longLivedToken,
        pageAccessToken: pageData.access_token,
        pageId: pageData.id,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 jours
        updatedAt: Date.now()
      },
      { upsert: true, new: true }
    );

    console.log('✅ Token Facebook sauvegardé avec succès');
    console.log('📄 Page ID:', pageData.id);
    console.log('📄 Page Name:', pageData.name);

    // Rediriger vers la page Facebook Marketplace avec succès
    res.redirect('/facebook-marketplace.html?connected=true');

  } catch (error) {
    console.error('❌ Erreur lors de l\'authentification Facebook:', error.response?.data || error.message);
    res.redirect('/facebook-marketplace.html?error=auth_failed');
  }
});

// 4. Déconnecter Facebook
app.post('/api/facebook/disconnect', async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    // Supprimer le token de la base de données
    await FacebookToken.deleteMany({});

    res.json({
      success: true,
      message: 'Déconnecté de Facebook avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la déconnexion Facebook:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la déconnexion'
    });
  }
});

// 5. Récupérer toutes les annonces Marketplace depuis Facebook
app.get('/api/facebook/listings', async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    // Récupérer le token Facebook
    const tokenData = await FacebookToken.findOne({});
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Non connecté à Facebook. Veuillez vous connecter.'
      });
    }

    // Récupérer les annonces Marketplace via l'API Graph
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${tokenData.pageId}/marketplace_listings`,
      {
        params: {
          access_token: tokenData.pageAccessToken,
          fields: 'id,name,description,price,availability,url,created_time'
        }
      }
    );

    res.json({
      success: true,
      data: response.data.data || []
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des annonces:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des annonces',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 6. Créer une annonce Marketplace depuis un produit
app.post('/api/facebook/listings', async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    const { productId, title, price, description, category } = req.body;

    if (!productId || !title || !price || !description) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis'
      });
    }

    // Récupérer le token Facebook
    const tokenData = await FacebookToken.findOne({});
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Non connecté à Facebook. Veuillez vous connecter.'
      });
    }

    // Récupérer le produit pour obtenir les images
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Produit non trouvé'
      });
    }

    // Créer l'annonce sur Facebook Marketplace
    const listingData = {
      name: title,
      description: description,
      price: price,
      availability: 'in stock'
    };

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${tokenData.pageId}/marketplace_listings`,
      listingData,
      {
        params: {
          access_token: tokenData.pageAccessToken
        }
      }
    );

    res.json({
      success: true,
      data: response.data,
      message: 'Annonce créée avec succès sur Facebook Marketplace'
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'annonce:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'annonce',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 7. Modifier une annonce Marketplace
app.put('/api/facebook/listings/:listingId', async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    const { listingId } = req.params;
    const { title, price, description } = req.body;

    if (!title || !price || !description) {
      return res.status(400).json({
        success: false,
        error: 'Tous les champs sont requis'
      });
    }

    // Récupérer le token Facebook
    const tokenData = await FacebookToken.findOne({});
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Non connecté à Facebook. Veuillez vous connecter.'
      });
    }

    // Modifier l'annonce
    const listingData = {
      name: title,
      description: description,
      price: price
    };

    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${listingId}`,
      listingData,
      {
        params: {
          access_token: tokenData.pageAccessToken
        }
      }
    );

    res.json({
      success: true,
      message: 'Annonce modifiée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la modification de l\'annonce:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de l\'annonce',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// 8. Supprimer une annonce Marketplace
app.delete('/api/facebook/listings/:listingId', async (req, res) => {
  try {
    if (!req.session.authenticated) {
      return res.status(403).json({
        success: false,
        error: 'Accès non autorisé. Veuillez vous connecter.'
      });
    }

    const { listingId } = req.params;

    // Récupérer le token Facebook
    const tokenData = await FacebookToken.findOne({});
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        error: 'Non connecté à Facebook. Veuillez vous connecter.'
      });
    }

    // Supprimer l'annonce
    await axios.delete(
      `https://graph.facebook.com/v18.0/${listingId}`,
      {
        params: {
          access_token: tokenData.pageAccessToken
        }
      }
    );

    res.json({
      success: true,
      message: 'Annonce supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'annonce:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'annonce',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// ===== Fin des routes pour Facebook Marketplace =====

// Route de test
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(`\n✓ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`\n🔐 Codes d'accès :`);
  console.log(`   - Code d'accès au site : ${ACCESS_CODE}`);
  console.log(`   - Code de suppression : ${DELETE_CODE}`);
  console.log(`\n⏱️  Durée de session : 4 heures\n`);
});
