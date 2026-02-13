import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const BIKES_FILE = join(DATA_DIR, 'bikes.json');

// Initialize default bikes if file doesn't exist
const defaultBikes = [
  {
    id: '1',
    name: 'Thunder E-Bike',
    type: 'electric',
    image: '/bikes/electric-1.jpg',
    pricePerHour: 15,
    kmLimit: 30,
    available: true,
    description: 'Premium electric bike with powerful motor and long battery life.',
    features: ['500W Motor', 'LCD Display', '50km Range', 'LED Lights'],
  },
  {
    id: '2',
    name: 'Trail Blazer MTB',
    type: 'mountain',
    image: '/bikes/mountain-1.jpg',
    pricePerHour: 12,
    kmLimit: 25,
    available: true,
    description: 'Rugged mountain bike built for off-road adventures.',
    features: ['21 Speed', 'Disc Brakes', 'Suspension Fork', 'Alloy Frame'],
  },
  {
    id: '3',
    name: 'City Cruiser',
    type: 'city',
    image: '/bikes/city-1.jpg',
    pricePerHour: 8,
    kmLimit: 20,
    available: false,
    description: 'Comfortable city bike perfect for daily commutes.',
    features: ['Step-Through Frame', 'Basket', 'Bell', 'Rear Rack'],
  },
  {
    id: '4',
    name: 'Velocity Sport',
    type: 'sport',
    image: '/bikes/sport-1.jpg',
    pricePerHour: 18,
    kmLimit: 40,
    available: true,
    description: 'High-performance sport bike for speed enthusiasts.',
    features: ['Carbon Frame', 'Aero Bars', '11 Speed', 'Clipless Pedals'],
  },
  {
    id: '5',
    name: 'Eco Rider E-Bike',
    type: 'electric',
    image: '/bikes/electric-2.jpg',
    pricePerHour: 14,
    kmLimit: 35,
    available: true,
    description: 'Eco-friendly electric bike with regenerative braking.',
    features: ['350W Motor', 'Regen Brakes', '45km Range', 'USB Charger'],
  },
  {
    id: '6',
    name: 'Urban Explorer',
    type: 'city',
    image: '/bikes/city-2.jpg',
    pricePerHour: 10,
    kmLimit: 25,
    available: true,
    description: 'Versatile urban bike with modern styling.',
    features: ['7 Speed', 'Fenders', 'Chain Guard', 'Kickstand'],
  },
];

export function getBikes() {
  try {
    // Create data directory if it doesn't exist
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!existsSync(BIKES_FILE)) {
      saveBikes(defaultBikes);
      return defaultBikes;
    }
    const data = readFileSync(BIKES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading bikes:', error);
    return defaultBikes;
  }
}

export function saveBikes(bikes) {
  try {
    writeFileSync(BIKES_FILE, JSON.stringify(bikes, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving bikes:', error);
    throw error;
  }
}





