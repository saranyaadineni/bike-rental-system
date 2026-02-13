import mongoose from 'mongoose';

const heroImageSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: '',
  },
  subtitle: {
    type: String,
    default: '',
  },
  order: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

heroImageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const HeroImage = mongoose.model('HeroImage', heroImageSchema);

export default HeroImage;
