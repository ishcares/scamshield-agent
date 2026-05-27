const mongoose = require('mongoose');

const extractedEntitiesSchema = new mongoose.Schema({
  domain: { type: String, default: '' },
  companyName: { type: String, default: '' },
  recruiterName: { type: String, default: '' },
  paymentAmount: { type: String, default: '' },
  urgencyPhrases: { type: [String], default: [] },
  urls: { type: [String], default: [] },
  phoneNumbers: { type: [String], default: [] },
}, { _id: false });

const patternMatchSchema = new mongoose.Schema({
  matched: { type: Boolean, default: false },
  similarReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'ScamReport', default: null },
  confidence: { type: Number, default: 0 },
  detail: { type: String, default: '' },
}, { _id: false });

const ScamReportSchema = new mongoose.Schema({
  submittedText: {
    type: String,
    required: true,
    maxlength: 20000,
  },
  extractedEntities: {
    type: extractedEntitiesSchema,
    default: () => ({}),
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    required: true,
  },
  confidenceScore: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
  },
  investigationSummary: {
    type: String,
    required: true,
  },
  redFlags: {
    type: [String],
    default: [],
  },
  recommendedActions: {
    type: [String],
    default: [],
  },
  patternMatch: {
    type: patternMatchSchema,
    default: () => ({}),
  },
  embedding: {
    type: [Number],
    default: [],
  },
  scamCategory: {
    type: String,
    default: 'Unknown',
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  source: {
    type: String,
    enum: ['text', 'screenshot', 'email'],
    default: 'text',
  },
});

// Index for recent reports query
ScamReportSchema.index({ timestamp: -1 });
ScamReportSchema.index({ riskLevel: 1 });

module.exports = mongoose.model('ScamReport', ScamReportSchema);
