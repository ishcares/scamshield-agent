const mongoose = require('mongoose');

const ScamFingerprintSchema = new mongoose.Schema({
  domain: {
    type: String,
    default: '',
  },
  impersonatedCompany: {
    type: String,
    default: '',
  },
  tactics: {
    type: [String],
    default: [],
  },
  recruiterAliases: {
    type: [String],
    default: [],
  },
  paymentMethods: {
    type: [String],
    default: [],
  },
  languagePatterns: {
    type: [String],
    default: [],
  },
  embedding: {
    type: [Number],
    default: [],
  },
  reportCount: {
    type: Number,
    default: 1,
  },
  firstSeen: {
    type: Date,
    default: Date.now,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  category: {
    type: String,
    default: 'Unknown',
  },
  riskLevel: {
    type: String,
    enum: ['HIGH', 'CRITICAL'],
    default: 'HIGH',
  },
});

ScamFingerprintSchema.index({ domain: 1 });
ScamFingerprintSchema.index({ impersonatedCompany: 1 });
ScamFingerprintSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('ScamFingerprint', ScamFingerprintSchema);
