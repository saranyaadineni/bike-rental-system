import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Location from '../models/Location.js';
import connectDB from '../config/database.js';

dotenv.config();

const defaultLocations = [
  {
    name: 'Jaisalmer',
    city: 'Jaisalmer',
    state: 'Rajasthan',
    country: 'India',
    isActive: true,
  },
  {
    name: 'Goa',
    city: 'Goa',
    state: 'Goa',
    country: 'India',
    isActive: true,
  },
  {
    name: 'Manali',
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    isActive: true,
  },
  {
    name: 'Rishikesh',
    city: 'Rishikesh',
    state: 'Uttarakhand',
    country: 'India',
    isActive: true,
  },
  {
    name: 'Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    isActive: true,
  },
];

async function seedLocations() {
  try {
    await connectDB();
    
    // Clear existing locations (optional)
    // await Location.deleteMany({});
    // console.log('Cleared existing locations');

    // Check if locations already exist
    const existingLocations = await Location.find({ name: { $in: defaultLocations.map(l => l.name) } });
    if (existingLocations.length > 0) {
      console.log('⚠️  Some locations already exist. Skipping seed.');
      console.log('Existing locations:', existingLocations.map(l => l.name).join(', '));
      process.exit(0);
    }

    // Insert locations
    const createdLocations = await Location.insertMany(defaultLocations);
    console.log(`✅ Seeded ${createdLocations.length} locations`);
    createdLocations.forEach(loc => {
      console.log(`  - ${loc.name}, ${loc.state}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error seeding locations:', error);
    process.exit(1);
  }
}

seedLocations();





