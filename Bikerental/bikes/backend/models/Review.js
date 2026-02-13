import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bikeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bike', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String },
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
