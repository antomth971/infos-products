// Script de migration : database.json → MongoDB Atlas
// Usage: node migrate-to-mongodb.js

const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Forcer Google DNS pour éviter les problèmes de résolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Charger les variables d'environnement
require('dotenv').config();

const mongoose = require('mongoose');
const Product = require('./backend/models/Product');

const DB_FILE = path.join(__dirname, 'backend/database.json');

async function migrate() {
  console.log('🚀 Démarrage de la migration vers MongoDB Atlas...\n');

  try {
    // 1. Connexion à MongoDB
    console.log('📡 Connexion à MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB Atlas\n');

    // 2. Lecture du fichier JSON
    console.log('📖 Lecture du fichier database.json...');
    if (!fs.existsSync(DB_FILE)) {
      console.error('❌ Fichier database.json introuvable !');
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log(`✅ ${data.length} produits trouvés dans database.json\n`);

    // 3. Vérifier les produits déjà existants
    console.log('🔍 Vérification des produits existants dans MongoDB...');
    const existingCount = await Product.countDocuments();
    console.log(`ℹ️  ${existingCount} produits déjà présents dans MongoDB\n`);

    // 4. Migration des produits
    console.log('📦 Migration en cours...');
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      try {
        // Vérifier si l'URL existe déjà
        const exists = await Product.findOne({ url: item.url });

        if (exists) {
          skipped++;
          if (skipped <= 5) {
            console.log(`  ⏭️  Produit ${i + 1}/${data.length} : URL déjà existante (ignoré)`);
          }
        } else {
          // Créer le nouveau produit (sans le champ 'id')
          const product = new Product({
            name: item.name,
            price: item.price,
            description: item.description,
            images: item.images,
            url: item.url,
            supplier: item.supplier,
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date()
          });

          await product.save();
          imported++;

          if (imported <= 5 || imported % 10 === 0) {
            console.log(`  ✅ Produit ${i + 1}/${data.length} : ${item.name.substring(0, 50)}...`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`  ❌ Erreur produit ${i + 1}:`, error.message);
      }
    }

    // 5. Résumé
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ DE LA MIGRATION');
    console.log('='.repeat(60));
    console.log(`Total dans database.json : ${data.length}`);
    console.log(`✅ Importés avec succès  : ${imported}`);
    console.log(`⏭️  Ignorés (doublons)    : ${skipped}`);
    console.log(`❌ Erreurs               : ${errors}`);
    console.log('='.repeat(60));

    const finalCount = await Product.countDocuments();
    console.log(`\n📈 Total dans MongoDB : ${finalCount} produits`);

    console.log('\n🎉 Migration terminée avec succès !');
    console.log('💡 Vous pouvez maintenant consulter vos données dans MongoDB Atlas');
    console.log('   👉 https://cloud.mongodb.com\n');

  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée\n');
  }
}

// Exécuter la migration
migrate().catch(error => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});
