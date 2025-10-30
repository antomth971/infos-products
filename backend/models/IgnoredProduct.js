const mongoose = require('mongoose');

const ignoredProductSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  name: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['doublon', 'erreur'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour rechercher par type et date
ignoredProductSchema.index({ type: 1, date: 1 });
ignoredProductSchema.index({ url: 1 });

module.exports = mongoose.model('IgnoredProduct', ignoredProductSchema);
