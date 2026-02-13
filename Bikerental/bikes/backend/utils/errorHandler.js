/**
 * Check if an error is a MongoDB connection error
 * @param {Error} error - The error to check
 * @returns {boolean} - True if it's a connection error
 */
export const isConnectionError = (error) => {
  if (!error) return false;
  
  const connectionErrorNames = [
    'MongoServerSelectionError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoTimeoutError',
  ];
  
  return connectionErrorNames.includes(error.name) || 
         error.code === 'ENOTFOUND' ||
         error.code === 'ETIMEDOUT' ||
         (error.message && error.message.includes('getaddrinfo'));
};

/**
 * Log error only if it's not a connection error
 * @param {string} context - Context where the error occurred
 * @param {Error} error - The error to log
 */
export const logErrorIfNotConnection = (context, error) => {
  if (!isConnectionError(error)) {
    console.error(`${context}:`, error);
  }
};



