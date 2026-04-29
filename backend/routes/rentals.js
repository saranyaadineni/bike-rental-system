import express from 'express';
import { authenticateToken, authorize } from '../middleware/auth.js';
import Rental from '../models/Rental.js';
import Bike from '../models/Bike.js';
import User from '../models/User.js';
import Review from '../models/Review.js';
import { transformRental } from '../utils/transform.js';
import { catchAsync } from '../utils/catchAsync.js';
import AppError from '../utils/appError.js';

const router = express.Router();

// Get all rentals
router.get('/', authenticateToken, catchAsync(async (req, res) => {
  const query = {};
  const { startDate, endDate } = req.query;

  // If regular user, only show their rentals
  if (req.user && !['admin', 'superadmin'].includes(req.user.role)) {
    query.userId = req.user.userId;
  }
  // For admin users, strictly enforce their assigned location
  else if (req.user && req.user.role === 'admin' && req.user.locationId) {
    // We need to filter by bikeId.locationId
    const bikesAtLocation = await Bike.find({ locationId: req.user.locationId }).select('_id');
    const bikeIds = bikesAtLocation.map(b => b._id);
    query.bikeId = { $in: bikeIds };
  }

  // Date filtering logic
  if (startDate || endDate) {
    const dateQuery = {};
    if (startDate) {
      const startOfDay = new Date(startDate);
      startOfDay.setUTCHours(0, 0, 0, 0); // Normalize to start of day UTC
      dateQuery.$gte = startOfDay;
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setUTCHours(23, 59, 59, 999); // Normalize to end of day UTC
      dateQuery.$lte = endOfDay;
    }
    
    // Search in both createdAt and startTime to be more flexible
    query.$or = [
      { createdAt: dateQuery },
      { startTime: dateQuery }
    ];

    // Basic validation for date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new AppError('Start date cannot be after end date', 400);
    }
  }

  const rentals = await Rental.find(query)
    .populate({
      path: 'bikeId',
      select: 'name type brand image pricePerHour kmLimit locationId excessKmCharge weekdayRate weekendRate',
      populate: { path: 'locationId', select: 'name city state' },
    })
    .populate('userId', 'name email')
    .sort({ createdAt: -1 });

  res.json(rentals.map(transformRental));
}));

// Get rental by ID (TEMP: DISABLED AUTH)
router.get('/:id', catchAsync(async (req, res) => {
  const rental = await Rental.findById(req.params.id)
    .populate({
      path: 'bikeId',
      populate: { path: 'locationId', select: 'name city state' },
    })
    .populate('userId', 'name email');

  if (!rental) throw new AppError('Rental not found', 404);

  res.json(transformRental(rental));
}));

// Create rental (TEMP: DISABLED AUTH)
router.post('/', catchAsync(async (req, res) => {
  const { bikeId, userId, startTime, endTime, totalAmount } = req.body;
  
  if (!bikeId || !startTime || !endTime || !userId) {
    throw new AppError('Required fields missing', 400);
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('Invalid start or end time format', 400);
  }

  if (end <= start) {
    throw new AppError('Drop-off time must be after pick-up time', 400);
  }

  const now = new Date();
  if (start < new Date(now.getTime() - 5 * 60000)) { // Allow 5 min buffer for latency
    throw new AppError('Pick-up time cannot be in the past', 400);
  }

  const bike = await Bike.findById(bikeId);
  if (!bike) throw new AppError('Bike not found', 404);

  // Use a small epsilon (1 minute) to avoid floating point issues
  const EPSILON = 1 / 60;

  // Validate pickup lead time (based on vehicle minBookingHours)
  const minHours = Number(bike.minBookingHours || 1);
  const leadTimeMs = start.getTime() - now.getTime();
  const leadTimeHours = leadTimeMs / (1000 * 60 * 60);

  if ((leadTimeHours + EPSILON) < minHours) {
    throw new AppError(`This vehicle must be booked at least ${minHours} hours in advance.`, 400);
  }

  // Validate minimum booking hours
  const durationMs = end.getTime() - start.getTime();
  const durationHours = durationMs / (1000 * 60 * 60);

  if ((durationHours + EPSILON) < minHours) {
    throw new AppError(`This vehicle requires a minimum booking of ${minHours} hours.`, 400);
  }

  // Check if all documents are verified
  const user = await User.findById(userId);
  if (!user) throw new AppError('User not found', 404);

  const hasDocuments = user.documents && user.documents.length > 0;
  if (!hasDocuments) {
    throw new AppError('Please upload and verify all required documents before booking a ride.', 400);
  }

  const allApproved = user.documents.every(doc => doc.status === 'approved');
  if (!allApproved) {
    const pendingCount = user.documents.filter(doc => doc.status !== 'approved').length;
    throw new AppError(`You have ${pendingCount} document(s) pending verification. Please wait for admin approval before booking.`, 400);
  }

  const newRental = new Rental({ 
    bikeId,
    userId,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    totalAmount,
    status: 'pending'
  });

  const savedRental = await newRental.save();
  
  // Mark bike as unavailable
  await Bike.findByIdAndUpdate(bikeId, { available: false });
  
  res.status(201).json(transformRental(savedRental));
}));

// Update rental status (TEMP: DISABLED AUTH)
router.patch('/:id/status', catchAsync(async (req, res) => {
  const { status, startKm, endKm, delay, totalCost } = req.body;
  const updates = { status };
  if (startKm !== undefined) updates.startKm = startKm;
  if (endKm !== undefined) updates.endKm = endKm;
  if (delay !== undefined) updates.delay = delay;
  if (totalCost !== undefined) updates.totalCost = totalCost;

  const rental = await Rental.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  if (!rental) throw new AppError('Rental not found', 404);
  
  // If completed or cancelled, make bike available again
  if (status === 'completed' || status === 'cancelled') {
    await Bike.findByIdAndUpdate(rental.bikeId, { available: true, status: 'available' });
  }
  
  res.json(transformRental(rental));
}));

// Cancel rental
router.post('/:id/cancel', catchAsync(async (req, res) => {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new AppError('Rental not found', 404);

  if (['ongoing', 'completed', 'cancelled'].includes(rental.status)) {
    throw new AppError(`Cannot cancel a ride that is already ${rental.status}`, 400);
  }

  rental.status = 'cancelled';
  await rental.save();

  // Make bike available again
  await Bike.findByIdAndUpdate(rental.bikeId, { available: true, status: 'available' });

  res.json(transformRental(rental));
}));

// Start ride
router.post('/:id/start', catchAsync(async (req, res) => {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new AppError('Rental not found', 404);

  if (rental.status !== 'confirmed') {
    throw new AppError('Ride must be confirmed before starting', 400);
  }

  rental.status = 'ongoing';
  rental.pickupTime = new Date();
  await rental.save();

  res.json(transformRental(rental));
}));

// Complete ride (Alternative endpoint used by frontend)
router.post('/:id/complete', catchAsync(async (req, res) => {
  const { endKm, delay, totalCost, actualReturnTime } = req.body;
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new AppError('Rental not found', 404);

  if (rental.status !== 'ongoing') {
    throw new AppError('Ride must be ongoing before completing', 400);
  }

  rental.status = 'completed';
  
  // Scenario: Billing must always use actual return time.
  // Admin end time should not affect pricing.
  const returnTime = actualReturnTime ? new Date(actualReturnTime) : new Date();
  rental.dropoffTime = new Date(); // Record when the record was closed (admin action)
  rental.actualReturnTime = returnTime; // Record when the bike was actually returned

  if (endKm) rental.endKm = endKm;
  
  // Calculate delay based on actualReturnTime - endTime
  if (rental.endTime) {
    const scheduledEnd = new Date(rental.endTime);
    const actualEnd = returnTime;
    const diffMs = actualEnd.getTime() - scheduledEnd.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    // Scenario 2: User Delay in Returning Bike
    // Add grace period (e.g., 15 minutes).
    const GRACE_PERIOD_MINS = 15;
    
    if (diffMins > GRACE_PERIOD_MINS) {
      // If delay exceeds grace, store the full delay
      rental.delay = diffMins;
    } else {
      // Within grace period or on time
      rental.delay = 0;
    }
  }

  // If totalCost is provided (calculated by frontend), use it. 
  // Otherwise, backend should calculate it (optional enhancement).
  if (totalCost !== undefined) {
    rental.totalCost = totalCost;
  }
  
  await rental.save();

  // Make bike available again
  await Bike.findByIdAndUpdate(rental.bikeId, { available: true, status: 'available' });

  res.json(transformRental(rental));
}));

// Submit review
router.post('/:id/review', catchAsync(async (req, res) => {
  const { rating, comment } = req.body;
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new AppError('Rental not found', 404);

  if (rental.status !== 'completed') {
    throw new AppError('Can only review completed rides', 400);
  }

  const review = new Review({
    rentalId: rental._id,
    userId: rental.userId,
    bikeId: rental.bikeId,
    rating,
    comment
  });

  await review.save();
  res.status(201).json(review);
}));

// Update ride images
router.post('/:id/images', catchAsync(async (req, res) => {
  const { images } = req.body;
  const rental = await Rental.findByIdAndUpdate(
    req.params.id,
    { userImages: images },
    { new: true }
  );

  if (!rental) throw new AppError('Rental not found', 404);
  res.json(transformRental(rental));
}));

// Delete rental
router.delete('/:id', authenticateToken, authorize('admin', 'superadmin'), catchAsync(async (req, res) => {
  const rental = await Rental.findById(req.params.id);
  if (!rental) throw new AppError('Rental not found', 404);

  // If the rental is active/ongoing, maybe we should make the bike available again?
  // Usually, deletion is for cancelled or completed records, but let's be safe.
  if (['confirmed', 'ongoing', 'active'].includes(rental.status)) {
    await Bike.findByIdAndUpdate(rental.bikeId, { available: true, status: 'available' });
  }

  await Rental.findByIdAndDelete(req.params.id);
  res.status(204).send();
}));

export default router;   