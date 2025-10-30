require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const IgnoredProduct = require('../models/IgnoredProduct');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/web-scraper';

async function clearDatabase() {
  try {
    console.log('🔌 Connexion à MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connecté à MongoDB');

    console.log('\n🗑️  Suppression de toutes les données...');

    const deletedProducts = await Product.deleteMany({});
    console.log(`   ✓ ${deletedProducts.deletedCount} produits supprimés`);

    const deletedIgnored = await IgnoredProduct.deleteMany({});
    console.log(`   ✓ ${deletedIgnored.deletedCount} produits ignorés supprimés`);

    console.log('\n✅ Base de données vidée avec succès !');
    console.log('💡 Vous pouvez maintenant ajouter vos liens manuellement.\n');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Déconnecté de MongoDB\n');
  }
}

// Exécuter le script
if (require.main === module) {
  clearDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { clearDatabase };
