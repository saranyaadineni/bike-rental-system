import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Location from '../models/Location.js';
import connectDB from '../config/database.js';

dotenv.config();

// Locations that need admins (excluding Goa, Bangalore, Hyderabad which already have admins)
const locationsToSeed = ['Jaisalmer', 'Manali', 'Mumbai', 'Rishikesh'];

async function seedAdmins() {
  try {
    await connectDB();
    
    console.log('🌱 Starting admin seeding process...\n');
    
    const createdAdmins = [];
    const skippedAdmins = [];
    
    for (const locationName of locationsToSeed) {
      try {
        // Find the location
        const location = await Location.findOne({ 
          $or: [
            { name: new RegExp(`^${locationName}$`, 'i') },
            { city: new RegExp(`^${locationName}$`, 'i') }
          ]
        });
        
        if (!location) {
          console.log(`⚠️  Location "${locationName}" not found. Skipping...`);
          skippedAdmins.push(locationName);
          continue;
        }
        
        // Check if admin already exists for this city
        const cityRegex = new RegExp(`^${location.city}$`, 'i');
        const cityLocations = await Location.find({ city: cityRegex }).select('_id');
        const cityLocationIds = cityLocations.map((l) => l._id);
        
        if (cityLocationIds.length > 0) {
          const existingAdmin = await User.findOne({
            role: 'admin',
            locationId: { $in: cityLocationIds },
          });
          
          if (existingAdmin) {
            console.log(`ℹ️  Admin already exists for "${locationName}". Skipping...`);
            skippedAdmins.push(locationName);
            continue;
          }
        }
        
        // Create admin credentials
        const email = `${locationName.toLowerCase()}@bikerental.com`;
        const password = locationName; // Password is the location name
        
        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
          console.log(`ℹ️  User with email "${email}" already exists. Skipping...`);
          skippedAdmins.push(locationName);
          continue;
        }
        
        // Create the admin
        const admin = new User({
          email,
          name: locationName,
          password,
          role: 'admin',
          locationId: location._id,
          walletBalance: 10,
          documents: [],
        });
        
        await admin.save();
        createdAdmins.push({ name: locationName, email, password });
        console.log(`✅ Created admin for "${locationName}"`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}\n`);
      } catch (error) {
        console.error(`❌ Error creating admin for "${locationName}":`, error.message);
        skippedAdmins.push(locationName);
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Seeded ${createdAdmins.length} new admins`);
    if (skippedAdmins.length > 0) {
      console.log(`ℹ️  Skipped ${skippedAdmins.length} locations (already exist or not found)`);
    }
    
    if (createdAdmins.length > 0) {
      console.log('\n📋 Created Admin Credentials:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      createdAdmins.forEach(admin => {
        console.log(`\n${admin.name}:`);
        console.log(`  Email: ${admin.email}`);
        console.log(`  Password: ${admin.password}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admins:', error);
    process.exit(1);
  }
}

seedAdmins();




