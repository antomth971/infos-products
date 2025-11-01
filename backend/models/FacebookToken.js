const mongoose = require('mongoose');

const facebookTokenSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  accessToken: {
    type: String,
    required: true
  },
  pageAccessToken: {
    type: String,
    default: null
  },
  pageId: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Mettre à jour automatiquement la date de modification
facebookTokenSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const FacebookToken = mongoose.model('FacebookToken', facebookTokenSchema);

module.exports = FacebookToken;
