/**
 * Utility for validating rental time ranges
 */

export interface TimeValidationResult {
  isValid: boolean;
  error?: string;
  durationMinutes: number;
  durationHours: number;
}

/**
 * Validates a rental time range
 * @param pickupDate - Pickup date string (YYYY-MM-DD)
 * @param pickupTime - Pickup time string (HH:mm)
 * @param dropoffDate - Dropoff date string (YYYY-MM-DD)
 * @param dropoffTime - Dropoff time string (HH:mm)
 * @param minDurationMinutes - Minimum required duration (default 0)
 * @returns Validation result with status and duration
 */
export function validateTimeRange(
  pickupDate: string,
  pickupTime: string,
  dropoffDate: string,
  dropoffTime: string,
  minDurationMinutes: number = 0
): TimeValidationResult {
  if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
    return { isValid: false, error: 'Please select both pickup and dropoff times', durationMinutes: 0, durationHours: 0 };
  }

  const start = new Date(`${pickupDate}T${pickupTime}`);
  const end = new Date(`${dropoffDate}T${dropoffTime}`);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date or time format', durationMinutes: 0, durationHours: 0 };
  }

  const now = new Date();
  // Allow a small buffer for "now" to account for execution time
  const bufferNow = new Date(now.getTime() - 5 * 60000); 

  if (start < bufferNow) {
    return { isValid: false, error: 'Pickup time cannot be in the past', durationMinutes: 0, durationHours: 0 };
  }

  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins <= 0) {
    return { isValid: false, error: 'Dropoff must be after pickup', durationMinutes: 0, durationHours: 0 };
  }

  if (minDurationMinutes > 0 && diffMins < minDurationMinutes) {
    return { 
      isValid: false, 
      error: `Minimum rental duration is ${minDurationMinutes} minutes`, 
      durationMinutes: diffMins, 
      durationHours: diffMins / 60 
    };
  }

  return {
    isValid: true,
    durationMinutes: diffMins,
    durationHours: diffMins / 60
  };
}

/**
 * Checks if a time range is valid without returning full details
 */
export function isTimeRangeValid(
  pickupDate: string,
  pickupTime: string,
  dropoffDate: string,
  dropoffTime: string
): boolean {
  return validateTimeRange(pickupDate, pickupTime, dropoffDate, dropoffTime).isValid;
}
