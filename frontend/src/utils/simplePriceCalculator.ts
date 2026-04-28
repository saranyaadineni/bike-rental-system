/**
 * Simple price calculator for the new pricing model:
 * - Price for 12 Hours (fixed)
 * - Price Per Hour (for >12 hrs) - multiplied by hours
 * - Price Per Week (fixed)
 */

import { Bike } from '@/types';

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

export interface SimplePriceBreakdown {
  durationHours: number;
  basePrice: number;
  total: number;
  pricingType: '12hours' | 'hourly' | 'weekly' | 'tariff';
  breakdown: string;
  // Legacy fields
  priceAfterSurge: number;
  surgeMultiplier: number;
  hasWeekend: boolean;
  excessKm: number;
  excessKmCharge: number;
  subtotal: number;
  gstPercentage: number;
  gstAmount: number;
  includedKm: number;
  extraKmPrice: number;
}

/**
 * Calculate price based on the new simple pricing model
 */
export function calculateSimplePrice(
  bike: Bike,
  startDate: Date,
  endDate: Date
): SimplePriceBreakdown {
  const durationMs = endDate.getTime() - startDate.getTime();
  const actualDurationHours = durationMs / (1000 * 60 * 60);

  if (actualDurationHours <= 0) {
    throw new Error('Drop-off time must be after pick-up time');
  }

  // Check minimum booking hours and use effective duration for pricing
  const minHours = bike.minBookingHours || 0;
  const durationHours = Math.max(actualDurationHours, minHours);

  // Check if we have the new pricing fields
  const hasPrice12Hours = bike.price12Hours && bike.price12Hours > 0;

  // Tariff fields
  // Check if we have valid tariff rates (must be greater than 0)
  const hasTariff =
    (bike.weekdayRate !== undefined && bike.weekdayRate !== null && bike.weekdayRate > 0) ||
    (bike.weekendRate !== undefined && bike.weekendRate !== null && bike.weekendRate > 0);

  let basePrice = 0;
  let pricingType: '12hours' | 'hourly' | 'weekly' | 'tariff' = 'hourly';
  let breakdown = '';
  let includedKm = bike.kmLimit || 0;
  let extraKmPrice = 0;

  // 1. Tariff Logic (Highest Priority)
  if (hasTariff) {
    pricingType = 'tariff';

    let tariffCost = 0;
    // Iterate through each hour (or part thereof) using a more robust loop
    let hoursLeft = durationHours;
    const currentTempDate = new Date(startDate);

    // Safety counter to prevent infinite loops
    let iterations = 0;
    const maxIterations = 10000; // Far more than any reasonable booking duration

    while (hoursLeft > 0 && iterations < maxIterations) {
      iterations++;
      const isWe = isWeekend(currentTempDate);
      const rate = isWe ? bike.weekendRate || 0 : bike.weekdayRate || 0;

      const step = Math.min(hoursLeft, 1);
      tariffCost += rate * step;

      hoursLeft -= step;
      // Advance by exactly the step taken
      currentTempDate.setTime(currentTempDate.getTime() + step * 3600000);
    }

    if (iterations >= maxIterations) {
      console.error('Infinite loop detected in calculateSimplePrice for bike:', bike.name);
    }

    basePrice = tariffCost;
    breakdown = minHours > 0 && actualDurationHours < minHours
      ? `Total for ${minHours}h (Minimum booking applied)`
      : `Total for ${durationHours.toFixed(1)} hrs`;

    // Use static kmLimit if available, otherwise calculate from kmLimitPerHour
    if (bike.kmLimit) {
      includedKm = bike.kmLimit;
    } else if (bike.kmLimitPerHour) {
      includedKm = bike.kmLimitPerHour * durationHours;
    }

    if (bike.excessKmCharge) {
      extraKmPrice = bike.excessKmCharge;
    }
  }
  // 2. 12-Hour Pricing Logic
  else if (durationHours <= 12 && hasPrice12Hours) {
    basePrice = bike.price12Hours!;
    pricingType = '12hours';
    const hours = Math.round(durationHours);
    breakdown = minHours > 0 && actualDurationHours < minHours
      ? `12h Package (Min ${minHours}h booking)`
      : `Total for ${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
  }
  // 3. Fallback to 12-hour pricing for >12h (if strict simple pricing)
  else if (durationHours > 12 && durationHours <= 24 && hasPrice12Hours) {
    basePrice = bike.price12Hours!;
    pricingType = '12hours';
    breakdown = `12 Hours Package: ₹${basePrice}`;
  }
  // 4. Legacy pricePerHour
  else if (bike.pricePerHour) {
    basePrice = bike.pricePerHour * durationHours;
    pricingType = 'hourly';
    breakdown = minHours > 0 && actualDurationHours < minHours
      ? `₹${bike.pricePerHour}/hr × ${minHours}h (Minimum applied) = ₹${basePrice.toFixed(2)}`
      : `${durationHours.toFixed(1)} hrs × ₹${bike.pricePerHour} = ₹${basePrice.toFixed(2)}`;
  }

  // Calculate GST - use the bike's gstPercentage if available, otherwise default to 18%
  // Ensure gstPercentage is a number and handle null/undefined/0 values correctly
  const gstPercentage =
    bike.gstPercentage !== undefined && bike.gstPercentage !== null
      ? Number(bike.gstPercentage)
      : 18.0;
  const gstAmount = (basePrice * gstPercentage) / 100;
  const total = basePrice + gstAmount;

  return {
    durationHours,
    basePrice,
    total,
    pricingType,
    breakdown,
    // Add fields for compatibility with legacy priceInfo
    priceAfterSurge: basePrice,
    surgeMultiplier: 1.0,
    hasWeekend: false, // Tariff handles weekend logic internally
    excessKm: 0,
    excessKmCharge: extraKmPrice,
    subtotal: basePrice,
    gstPercentage,
    gstAmount,
    includedKm,
    extraKmPrice,
  };
}
