import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const options = {
      dbName: process.env.MONGODB_DB_NAME || 'bikerental',
      serverSelectionTimeoutMS: 30000, // 30 seconds timeout
      socketTimeoutMS: 60000, // 60 seconds socket timeout
      connectTimeoutMS: 30000, // 30 seconds connection timeout
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      retryWrites: true,
      retryReads: true,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('✅ MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error('Connection details:', {
      uri: process.env.MONGODB_URI ? 'URI is set' : 'URI is missing',
      errorCode: error.code,
      errorName: error.name,
    });
    
    // Don't exit immediately, allow the server to start and retry
    // The connection will be retried on the next operation
    console.warn('⚠️ Server will continue running. MongoDB operations will retry on next request.');
    return null;
  }
};

export default connectDB;



