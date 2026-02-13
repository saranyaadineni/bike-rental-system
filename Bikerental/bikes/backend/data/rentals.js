import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const RENTALS_FILE = join(DATA_DIR, 'rentals.json');

export function getRentals() {
  try {
    // Create data directory if it doesn't exist
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    
    if (!existsSync(RENTALS_FILE)) {
      return [];
    }
    const data = readFileSync(RENTALS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading rentals:', error);
    return [];
  }
}

export function saveRentals(rentals) {
  try {
    writeFileSync(RENTALS_FILE, JSON.stringify(rentals, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving rentals:', error);
    throw error;
  }
}





