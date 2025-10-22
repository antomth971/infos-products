// Script de démarrage qui force Node.js à utiliser Google DNS
const dns = require('dns');

// Forcer l'utilisation de Google DNS
dns.setServers(['8.8.8.8', '8.8.4.4']);

console.log('🔧 DNS configuré pour utiliser Google DNS:', dns.getServers());

// Démarrer le serveur
require('./backend/server.js');
