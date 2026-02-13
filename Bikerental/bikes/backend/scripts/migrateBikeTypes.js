import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Bike from '../models/Bike.js';
import mongoose from 'mongoose';

dotenv.config();

async function migrateBikeTypes() {
  try {
    await connectDB();

    const mappings = {
      mountain: 'fuel',
      city: 'scooter',
      sport: 'fuel',
    };

    let totalUpdated = 0;
    for (const [from, to] of Object.entries(mappings)) {
      const result = await Bike.updateMany({ type: from }, { $set: { type: to } });
      console.log(`✅ ${from} → ${to}: ${result.modifiedCount} updated`);
      totalUpdated += result.modifiedCount || 0;
    }

    console.log(`\n✅ Migration complete. Total bikes updated: ${totalUpdated}`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateBikeTypes();
