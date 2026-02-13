// Helper function to transform MongoDB document _id to id
export function transformBike(bike) {
  if (!bike) return null;
  const bikeObj = bike.toObject ? bike.toObject() : bike;
  return {
    id: bikeObj._id?.toString() || bikeObj.id,
    name: bikeObj.name,
    type: bikeObj.type,
    category: bikeObj.category || 'midrange',
    brand: bikeObj.brand,
    year: bikeObj.year || null,
    image: bikeObj.image,
    images: bikeObj.images || [],
    pricePerHour: bikeObj.pricePerHour,
    price12Hours: bikeObj.price12Hours || null,
    pricePerHour13: bikeObj.pricePerHour13 || null,
    pricePerHour14: bikeObj.pricePerHour14 || null,
    pricePerHour15: bikeObj.pricePerHour15 || null,
    pricePerHour16: bikeObj.pricePerHour16 || null,
    pricePerHour17: bikeObj.pricePerHour17 || null,
    pricePerHour18: bikeObj.pricePerHour18 || null,
    pricePerHour19: bikeObj.pricePerHour19 || null,
    pricePerHour20: bikeObj.pricePerHour20 || null,
    pricePerHour21: bikeObj.pricePerHour21 || null,
    pricePerHour22: bikeObj.pricePerHour22 || null,
    pricePerHour23: bikeObj.pricePerHour23 || null,
    pricePerHour24: bikeObj.pricePerHour24 || null,
    pricePerWeek: bikeObj.pricePerWeek || null,
    kmLimit: bikeObj.kmLimit,
    available: bikeObj.available,
    // Tariff fields
    weekdayRate: bikeObj.weekdayRate || null,
    weekendRate: bikeObj.weekendRate || null,
    excessKmCharge: bikeObj.excessKmCharge || null,
    kmLimitPerHour: bikeObj.kmLimitPerHour || null,
    minBookingHours: bikeObj.minBookingHours || null,
    gstPercentage: bikeObj.gstPercentage !== undefined && bikeObj.gstPercentage !== null ? bikeObj.gstPercentage : 18.0,
    weekendSurgeMultiplier: bikeObj.weekendSurgeMultiplier || 1.0,
    pricingSlabs: bikeObj.pricingSlabs || null,
    description: bikeObj.description,
    features: bikeObj.features,
    locationId: bikeObj.locationId?._id?.toString() || bikeObj.locationId?.toString() || bikeObj.locationId,
    location: bikeObj.locationId && typeof bikeObj.locationId === 'object' ? {
      id: bikeObj.locationId._id?.toString(),
      name: bikeObj.locationId.name,
      city: bikeObj.locationId.city,
      state: bikeObj.locationId.state,
    } : null
  };
}

export function transformUser(user) {
  if (!user) return null;
  const userObj = user.toObject ? user.toObject() : user;
  return {
    id: userObj._id?.toString() || userObj.id,
    email: userObj.email,
    name: userObj.name,
    mobile: userObj.mobile || '',
    emergencyContact: userObj.emergencyContact || '',
    familyContact: userObj.familyContact || '',
    permanentAddress: userObj.permanentAddress || '',
    currentAddress: userObj.currentAddress || '',
    currentLocationId: userObj.currentLocationId?._id?.toString() || userObj.currentLocationId?.toString() || userObj.currentLocationId || null,
    hotelStay: userObj.hotelStay || '',
    role: userObj.role,
    locationId: userObj.locationId?._id?.toString() || userObj.locationId?.toString() || userObj.locationId || null,
    walletBalance: userObj.walletBalance,
    isVerified: userObj.isVerified || false,
    documents: userObj.documents || [],
    createdAt: userObj.createdAt
  };
}

export function transformRental(rental) {
  if (!rental) return null;
  const rentalObj = rental.toObject ? rental.toObject() : rental;
  
  // Handle populated bikeId and userId
  let bikeId = rentalObj.bikeId;
  let userId = rentalObj.userId;
  let bike = null;
  let user = null;
  
  // Extract bikeId - could be ObjectId, populated object, or string
  if (bikeId && typeof bikeId === 'object' && bikeId._id) {
    // Populated bike object
    bike = transformBike(bikeId);
    bikeId = bikeId._id.toString();
  } else if (bikeId && typeof bikeId === 'object') {
    // Mongoose ObjectId
    bikeId = bikeId.toString();
  } else {
    bikeId = bikeId?.toString() || bikeId;
  }
  
  // Extract userId - could be ObjectId, populated object, or string
  if (userId && typeof userId === 'object' && userId._id) {
    // Populated user object
    user = transformUser(userId);
    userId = userId._id.toString();
  } else if (userId && typeof userId === 'object') {
    // Mongoose ObjectId
    userId = userId.toString();
  } else {
    userId = userId?.toString() || userId;
  }
  
  return {
    id: rentalObj._id?.toString() || rentalObj.id,
    bikeId: bikeId,
    userId: userId,
    startTime: rentalObj.startTime,
    endTime: rentalObj.endTime,
    totalCost: rentalObj.totalCost,
    status: rentalObj.status,
    bookingId: rentalObj.bookingId,
    pickupTime: rentalObj.pickupTime,
    dropoffTime: rentalObj.dropoffTime,
    totalAmount: rentalObj.totalAmount,
    paymentStatus: rentalObj.paymentStatus,
    paymentInfo: rentalObj.paymentInfo,
    startKm: rentalObj.startKm,
    endKm: rentalObj.endKm,
    delay: rentalObj.delay,
    userImages: rentalObj.userImages || [],
    bike: bike,
    user: user
  };
}
