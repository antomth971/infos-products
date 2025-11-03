const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
    default: 'Produit sans titre'
  },
  price: {
    type: String,
    default: 'indispo'
  },
  description: [{
    type: String
  }],
  images: [{
    type: String
  }],
  url: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour rechercher par fournisseur
productSchema.index({ supplier: 1 });

// Note: L'index sur 'url' est déjà créé automatiquement via unique: true

module.exports = mongoose.model('Product', productSchema);
