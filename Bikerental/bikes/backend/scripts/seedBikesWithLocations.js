import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bike from '../models/Bike.js';
import Location from '../models/Location.js';
import connectDB from '../config/database.js';

dotenv.config();

// Different bikes and prices for different locations
const bikesByLocation = {
  'Jaisalmer': [
    {
      name: 'Desert Cruiser E-Bike',
      type: 'electric',
      image: '/bikes/electric-1.jpg',
      pricePerHour: 20,
      kmLimit: 40,
      available: true,
      description: 'Perfect for desert adventures with long battery life.',
      features: ['500W Motor', 'LCD Display', '60km Range', 'LED Lights', 'Desert Ready'],
    },
    {
      name: 'Sand Storm MTB',
      type: 'fuel',
      image: '/bikes/mountain-1.jpg',
      pricePerHour: 15,
      kmLimit: 30,
      available: true,
      description: 'Rugged mountain bike for desert trails.',
      features: ['21 Speed', 'Disc Brakes', 'Suspension Fork', 'Alloy Frame'],
    },
    {
      name: 'City Explorer',
      type: 'scooter',
      image: '/bikes/city-1.jpg',
      pricePerHour: 10,
      kmLimit: 25,
      available: true,
      description: 'Comfortable city bike for Jaisalmer streets.',
      features: ['Step-Through Frame', 'Basket', 'Bell', 'Rear Rack'],
    },
  ],
  'Goa': [
    {
      name: 'Beach Rider E-Bike',
      type: 'electric',
      image: '/bikes/electric-2.jpg',
      pricePerHour: 18,
      kmLimit: 35,
      available: true,
      description: 'Eco-friendly electric bike perfect for beach rides.',
      features: ['350W Motor', 'Regen Brakes', '45km Range', 'USB Charger'],
    },
    {
      name: 'Coastal Cruiser',
      type: 'scooter',
      image: '/bikes/city-2.jpg',
      pricePerHour: 12,
      kmLimit: 30,
      available: true,
      description: 'Versatile urban bike for Goa beaches.',
      features: ['7 Speed', 'Fenders', 'Chain Guard', 'Kickstand'],
    },
    {
      name: 'Goa Sport Bike',
      type: 'fuel',
      image: '/bikes/sport-1.jpg',
      pricePerHour: 25,
      kmLimit: 50,
      available: true,
      description: 'High-performance sport bike for coastal roads.',
      features: ['Carbon Frame', 'Aero Bars', '11 Speed', 'Clipless Pedals'],
    },
  ],
  'Manali': [
    {
      name: 'Mountain Thunder E-Bike',
      type: 'electric',
      image: '/bikes/electric-1.jpg',
      pricePerHour: 22,
      kmLimit: 45,
      available: true,
      description: 'Powerful e-bike for mountain terrain.',
      features: ['600W Motor', 'LCD Display', '70km Range', 'LED Lights', 'Mountain Mode'],
    },
    {
      name: 'Himalayan Trail MTB',
      type: 'fuel',
      image: '/bikes/mountain-1.jpg',
      pricePerHour: 18,
      kmLimit: 35,
      available: true,
      description: 'Built for Himalayan mountain trails.',
      features: ['27 Speed', 'Hydraulic Disc Brakes', 'Full Suspension', 'Tubeless Ready'],
    },
  ],
  'Rishikesh': [
    {
      name: 'Adventure E-Bike',
      type: 'electric',
      image: '/bikes/electric-2.jpg',
      pricePerHour: 20,
      kmLimit: 40,
      available: true,
      description: 'Perfect for Rishikesh adventures.',
      features: ['400W Motor', 'Regen Brakes', '50km Range', 'USB Charger'],
    },
    {
      name: 'Yoga City Bike',
      type: 'scooter',
      image: '/bikes/city-1.jpg',
      pricePerHour: 10,
      kmLimit: 25,
      available: true,
      description: 'Comfortable bike for Rishikesh city rides.',
      features: ['Step-Through Frame', 'Basket', 'Bell', 'Rear Rack'],
    },
  ],
  'Mumbai': [
    {
      name: 'Metro E-Bike',
      type: 'electric',
      image: '/bikes/electric-1.jpg',
      pricePerHour: 15,
      kmLimit: 30,
      available: true,
      description: 'Perfect for Mumbai city commuting.',
      features: ['500W Motor', 'LCD Display', '50km Range', 'LED Lights'],
    },
    {
      name: 'Urban Explorer',
      type: 'scooter',
      image: '/bikes/city-2.jpg',
      pricePerHour: 8,
      kmLimit: 20,
      available: true,
      description: 'Affordable city bike for Mumbai streets.',
      features: ['7 Speed', 'Fenders', 'Chain Guard', 'Kickstand'],
    },
    {
      name: 'Mumbai Sport',
      type: 'fuel',
      image: '/bikes/sport-1.jpg',
      pricePerHour: 20,
      kmLimit: 40,
      available: true,
      description: 'Sport bike for Mumbai highways.',
      features: ['Carbon Frame', 'Aero Bars', '11 Speed', 'Clipless Pedals'],
    },
  ],
};

async function seedBikesWithLocations() {
  try {
    await connectDB();
    
    // Get all locations
    const locations = await Location.find({ isActive: true });
    if (locations.length === 0) {
      console.log('⚠️  No locations found. Please run seed:locations first.');
      process.exit(1);
    }

    // Clear existing bikes
    await Bike.deleteMany({});
    console.log('Cleared existing bikes');

    let totalBikes = 0;

    // Create bikes for each location
    for (const location of locations) {
      const locationBikes = bikesByLocation[location.name] || [];
      
      if (locationBikes.length === 0) {
        console.log(`⚠️  No bikes defined for ${location.name}, skipping...`);
        continue;
      }

      const bikesToInsert = locationBikes.map(bike => ({
        ...bike,
        locationId: location._id,
      }));

      await Bike.insertMany(bikesToInsert);
      totalBikes += bikesToInsert.length;
      console.log(`✅ Added ${bikesToInsert.length} bikes for ${location.name}`);
    }

    console.log(`\n✅ Seeded ${totalBikes} bikes across ${locations.length} locations`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding bikes:', error);
    process.exit(1);
  }
}

seedBikesWithLocations();





