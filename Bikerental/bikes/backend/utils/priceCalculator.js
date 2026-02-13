/**
 * Price calculation utility for bike rentals
 * Handles base price, excess km charges, GST, and weekend surge pricing
 */

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 * @param {Date} date - The date to check
 * @returns {boolean} True if weekend, false otherwise
 */
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if any part of the rental period falls on a weekend
 * @param {Date} startDate - Rental start date
 * @param {Date} endDate - Rental end date
 * @returns {boolean} True if any part of the period is on weekend
 */
export function hasWeekendPeriod(startDate, endDate) {
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    if (isWeekend(current)) {
      return true;
    }
    // Move to next day
    current.setDate(current.getDate() + 1);
  }
  
  return false;
}

/**
 * Calculate the appropriate pricing slab based on duration
 * @param {Object} bike - Bike object with pricingSlabs
 * @param {number} durationHours - Rental duration in hours
 * @returns {string|null} - 'hourly', 'daily', 'weekly', or null if no match
 */
export function getPricingSlab(bike, durationHours) {
  if (!bike.pricingSlabs) {
    return null;
  }

  const { hourly, daily, weekly } = bike.pricingSlabs;

  // Check weekly first (longest duration)
  if (weekly && durationHours >= weekly.duration_min && durationHours <= weekly.duration_max) {
    return 'weekly';
  }

  // Check daily
  if (daily && durationHours >= daily.duration_min && durationHours <= daily.duration_max) {
    return 'daily';
  }

  // Check hourly
  if (hourly && durationHours >= hourly.duration_min && durationHours <= hourly.duration_max) {
    return 'hourly';
  }

  return null;
}

/**
 * Calculate rental price with all charges
 * @param {Object} bike - Bike object
 * @param {Date} startDate - Rental start date/time
 * @param {Date} endDate - Rental end date/time
 * @param {string} pricingType - 'hourly', 'daily', or 'weekly'
 * @param {number} actualKm - Actual kilometers driven (optional, for excess km calculation)
 * @returns {Object} Price breakdown
 */
export function calculateRentalPrice(bike, startDate, endDate, pricingType, actualKm = null) {
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = Math.max(0, durationMs / (1000 * 60 * 60));

  // Get pricing slab
  let pricingSlab = null;
  if (bike.pricingSlabs && bike.pricingSlabs[pricingType]) {
    pricingSlab = bike.pricingSlabs[pricingType];
  } else {
    // Fallback to legacy pricePerHour
    if (bike.pricePerHour) {
      return calculateLegacyPrice(bike, durationHours, actualKm);
    }
    throw new Error(`Pricing slab '${pricingType}' not found for bike ${bike.name}`);
  }

  // Validate duration against slab
  if (durationHours < pricingSlab.duration_min || durationHours > pricingSlab.duration_max) {
    throw new Error(
      `Duration ${durationHours.toFixed(2)} hours is outside the valid range for ${pricingType} pricing (${pricingSlab.duration_min}-${pricingSlab.duration_max} hours)`
    );
  }

  // Calculate base price
  let basePrice = pricingSlab.price;

  // Apply minimum booking rule
  if (pricingSlab.minimum_booking_rule === 'min_duration') {
    if (durationHours < pricingSlab.minimum_value) {
      // Calculate price as if minimum duration was used
      basePrice = pricingSlab.price * (pricingSlab.minimum_value / durationHours);
    }
  } else if (pricingSlab.minimum_booking_rule === 'min_price') {
    basePrice = Math.max(basePrice, pricingSlab.minimum_value);
  }

  // Apply weekend surge pricing
  const hasWeekend = hasWeekendPeriod(startDate, endDate);
  const surgeMultiplier = hasWeekend ? (bike.weekendSurgeMultiplier || 1.0) : 1.0;
  const priceAfterSurge = basePrice * surgeMultiplier;

  // Calculate excess km charges
  let excessKm = 0;
  let excessKmCharge = 0;
  if (actualKm !== null && actualKm > pricingSlab.included_km) {
    excessKm = Math.max(0, actualKm - pricingSlab.included_km);
    excessKmCharge = excessKm * pricingSlab.extra_km_price;
  }

  // Calculate subtotal
  const subtotal = priceAfterSurge + excessKmCharge;

  // Calculate GST
  const gstPercentage = bike.gstPercentage || 18.0;
  const gstAmount = (subtotal * gstPercentage) / 100;

  // Calculate total
  const total = subtotal + gstAmount;

  return {
    basePrice,
    priceAfterSurge,
    surgeMultiplier,
    hasWeekend,
    excessKm,
    excessKmCharge,
    subtotal,
    gstPercentage,
    gstAmount,
    total,
    durationHours,
    pricingType,
    includedKm: pricingSlab.included_km,
    extraKmPrice: pricingSlab.extra_km_price,
  };
}

/**
 * Legacy price calculation (for backward compatibility)
 * @param {Object} bike - Bike object with pricePerHour
 * @param {number} durationHours - Rental duration in hours
 * @param {number} actualKm - Actual kilometers driven
 * @returns {Object} Price breakdown
 */
function calculateLegacyPrice(bike, durationHours, actualKm = null) {
  const basePrice = (bike.pricePerHour || 0) * durationHours;
  
  // Calculate excess km charges (if kmLimit exists)
  let excessKm = 0;
  let excessKmCharge = 0;
  if (actualKm !== null && bike.kmLimit && actualKm > bike.kmLimit) {
    excessKm = actualKm - bike.kmLimit;
    // Default extra km price (can be configured)
    const extraKmPrice = 5; // ₹5 per extra km
    excessKmCharge = excessKm * extraKmPrice;
  }

  const subtotal = basePrice + excessKmCharge;
  const gstPercentage = bike.gstPercentage || 18.0;
  const gstAmount = (subtotal * gstPercentage) / 100;
  const total = subtotal + gstAmount;

  return {
    basePrice,
    priceAfterSurge: basePrice,
    surgeMultiplier: 1.0,
    hasWeekend: false,
    excessKm,
    excessKmCharge,
    subtotal,
    gstPercentage,
    gstAmount,
    total,
    durationHours,
    pricingType: 'hourly',
    includedKm: bike.kmLimit || 0,
    extraKmPrice: 5,
  };
}

/**
 * Get available pricing slabs for a bike
 * @param {Object} bike - Bike object
 * @returns {Array} Array of available pricing types
 */
export function getAvailablePricingSlabs(bike) {
  const available = [];
  if (bike.pricingSlabs) {
    if (bike.pricingSlabs.hourly) available.push('hourly');
    if (bike.pricingSlabs.daily) available.push('daily');
    if (bike.pricingSlabs.weekly) available.push('weekly');
  }
  
  // If no pricing slabs but has legacy pricePerHour, return hourly
  if (available.length === 0 && bike.pricePerHour) {
    available.push('hourly');
  }
  
  return available;
}

