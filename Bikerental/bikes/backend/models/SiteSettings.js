import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

siteSettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export default SiteSettings;
