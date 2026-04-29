import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Bike from '../models/Bike.js';
import Location from '../models/Location.js';
import connectDB from '../config/database.js';

dotenv.config();

// Different bikes and prices for different locations
const bikesByLocation = {
  'Hitech City': [
    {
      name: 'Metro E-Bike',
      type: 'electric',
      image: 'https://images.unsplash.com/photo-1558981403-c5f97dbbe480?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 15,
      kmLimit: 30,
      minBookingHours: 2,
      available: true,
      description: 'Perfect for Hitech City commuting.',
      features: ['500W Motor', 'LCD Display', '50km Range', 'LED Lights'],
    },
    {
      name: 'Urban Explorer',
      type: 'scooter',
      image: 'https://images.unsplash.com/photo-1594145070103-0c7f2167666e?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 8,
      kmLimit: 20,
      minBookingHours: 1,
      available: true,
      description: 'Affordable city bike for Hitech City streets.',
      features: ['7 Speed', 'Fenders', 'Chain Guard', 'Kickstand'],
    },
    {
      name: 'Mumbai Sport',
      type: 'fuel',
      image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 20,
      kmLimit: 40,
      minBookingHours: 4,
      available: true,
      description: 'Sport bike for long rides.',
      features: ['Carbon Frame', 'Aero Bars', '11 Speed', 'Clipless Pedals'],
    },
  ],
  'Ameerpet': [
    {
      name: 'Beach Rider E-Bike',
      type: 'electric',
      image: 'https://images.unsplash.com/photo-1558981403-c5f97dbbe480?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 18,
      kmLimit: 35,
      minBookingHours: 2,
      available: true,
      description: 'Eco-friendly electric bike perfect for Ameerpet.',
      features: ['350W Motor', 'Regen Brakes', '45km Range', 'USB Charger'],
    },
    {
      name: 'Coastal Cruiser',
      type: 'scooter',
      image: 'https://images.unsplash.com/photo-1594145070103-0c7f2167666e?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 12,
      kmLimit: 30,
      minBookingHours: 2,
      available: true,
      description: 'Versatile urban bike for Ameerpet area.',
      features: ['7 Speed', 'Fenders', 'Chain Guard', 'Kickstand'],
    },
    {
      name: 'Goa Sport Bike',
      type: 'fuel',
      image: 'https://images.unsplash.com/photo-1449426468159-d96dbf08f19f?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 25,
      kmLimit: 50,
      minBookingHours: 6,
      available: true,
      description: 'High-performance sport bike.',
      features: ['Carbon Frame', 'Aero Bars', '11 Speed', 'Clipless Pedals'],
    },
  ],
  'Gachibowli': [
    {
      name: 'Mountain Thunder E-Bike',
      type: 'electric',
      image: 'https://images.unsplash.com/photo-1558981403-c5f97dbbe480?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 22,
      kmLimit: 45,
      minBookingHours: 3,
      available: true,
      description: 'Powerful e-bike for Gachibowli terrain.',
      features: ['600W Motor', 'LCD Display', '70km Range', 'LED Lights', 'Mountain Mode'],
    },
    {
      name: 'Himalayan Trail MTB',
      type: 'fuel',
      image: 'https://images.unsplash.com/photo-1532298229144-0ee0c57515c5?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 18,
      kmLimit: 35,
      minBookingHours: 4,
      available: true,
      description: 'Built for trails and long distances.',
      features: ['27 Speed', 'Hydraulic Disc Brakes', 'Full Suspension', 'Tubeless Ready'],
    },
  ],
  'Kukatpally': [
    {
      name: 'Kukatpally Commuter',
      type: 'electric',
      image: 'https://images.unsplash.com/photo-1558981403-c5f97dbbe480?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 15,
      kmLimit: 30,
      minBookingHours: 2,
      available: true,
      description: 'Reliable e-bike for Kukatpally.',
      features: ['400W Motor', '50km Range', 'LED Display'],
    },
    {
      name: 'City Scooter',
      type: 'scooter',
      image: 'https://images.unsplash.com/photo-1594145070103-0c7f2167666e?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 10,
      kmLimit: 25,
      minBookingHours: 1,
      available: true,
      description: 'Easy to park and ride in Kukatpally.',
      features: ['Compact Design', 'Fuel Efficient', 'Storage Box'],
    },
  ],
  'LB Nagar': [
    {
      name: 'LB Nagar E-Commuter',
      type: 'electric',
      image: 'https://images.unsplash.com/photo-1558981403-c5f97dbbe480?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 18,
      kmLimit: 35,
      minBookingHours: 2,
      available: true,
      description: 'Ideal for commuting in LB Nagar.',
      features: ['450W Motor', 'LCD Display', '55km Range', 'LED Lights'],
    },
    {
      name: 'LB Nagar Scooter',
      type: 'scooter',
      image: 'https://images.unsplash.com/photo-1594145070103-0c7f2167666e?q=80&w=800&auto=format&fit=crop',
      pricePerHour: 12,
      kmLimit: 30,
      minBookingHours: 2,
      available: true,
      description: 'Fast and reliable scooter for LB Nagar.',
      features: ['Powerful Engine', 'Comfortable Seat', 'Large Storage'],
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





