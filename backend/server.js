// Charger les variables d'environnement depuis .env
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const mongoose = require('mongoose');
const path = require('path');
const XLSX = require('xlsx');
const puppeteer = require('puppeteer');
const session = require('express-session');
const Product = require('./models/Product');

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
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL est requis' });
    }

    // Détecter le fournisseur
    const supplier = detectSupplier(url);
    if (!supplier) {
      return res.status(400).json({
        success: false,
        error: 'Site non pris en charge, vérifier l\'URL'
      });
    }

    console.log(`Fournisseur détecté: ${supplier.config.name}`);

    // Vérifier si l'URL a déjà été scannée
    const existingProduct = await Product.findOne({ url });
    if (existingProduct) {
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
      supplier: supplier.config.name
    });

    await newProduct.save();

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

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running' });
});

app.listen(PORT, () => {
  console.log(`\n✓ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`\n🔐 Codes d'accès :`);
  console.log(`   - Code d'accès au site : ${ACCESS_CODE}`);
  console.log(`   - Code de suppression : ${DELETE_CODE}`);
  console.log(`\n⏱️  Durée de session : 4 heures\n`);
});
