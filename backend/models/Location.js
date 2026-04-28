import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  state: {
    type: String,
    required: true,
  },
  country: {
    type: String,
    default: 'India',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Normalize city and state before saving
locationSchema.pre('save', function(next) {
  if (this.isModified('city')) {
    this.city = this.city.trim().toLowerCase();
  }
  if (this.isModified('state')) {
    this.state = this.state.trim();
  }
  if (this.isModified('name')) {
    this.name = this.name.trim();
  }
  next();
});

locationSchema.index({ name: 1, city: 1, state: 1 }, { unique: true });

const Location = mongoose.model('Location', locationSchema);

export default Location;





