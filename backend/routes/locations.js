import express from 'express';
import Location from '../models/Location.js';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import { logErrorIfNotConnection } from '../utils/errorHandler.js';

const router = express.Router();

const STATE_CITY_DATA = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati'],
  'Arunachal Pradesh': ['Itanagar', 'Tawang', 'Ziro', 'Pasighat'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Sikkim': ['Gangtok'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  'Tripura': ['Agartala'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
  'Delhi': ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi'],
  'Puducherry': ['Puducherry'],
};

const normalizeText = (value) => String(value || '').trim();

const findCanonicalState = (stateRaw) => {
  const target = normalizeText(stateRaw).toLowerCase();
  if (!target) return null;
  return (
    Object.keys(STATE_CITY_DATA).find((s) => s.toLowerCase() === target) ||
    null
  );
};

const includesIgnoreCase = (list, valueRaw) => {
  const target = normalizeText(valueRaw).toLowerCase();
  if (!target) return false;
  return list.some((v) => String(v || '').trim().toLowerCase() === target);
};

const validateLocationData = (name, city, state) => {
  const nameTrim = normalizeText(name);
  const cityTrim = normalizeText(city);
  const stateTrim = normalizeText(state);

  if (!stateTrim) return { error: 'State is required' };
  if (!nameTrim || !cityTrim) return { error: 'Required fields missing' };

  if (!/^[a-zA-Z\s]+$/.test(nameTrim)) {
    return { error: 'Location name must contain only alphabets and spaces' };
  }

  const canonicalState = findCanonicalState(stateTrim);
  if (!canonicalState) {
    return { error: 'Invalid state selected' };
  }

  const knownStatesForCity = Object.entries(STATE_CITY_DATA)
    .filter(([, cities]) => includesIgnoreCase(cities, cityTrim))
    .map(([st]) => st);

  if (knownStatesForCity.length > 0 && !includesIgnoreCase(STATE_CITY_DATA[canonicalState], cityTrim)) {
    return { error: `City '${cityTrim}' does not belong to the state '${canonicalState}'` };
  }

  return {
    error: null,
    data: {
      name: nameTrim,
      city: cityTrim,
      state: canonicalState,
    },
  };
};

// Get all locations (public)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    let locations;

    if (all === 'true') {
      // Return all active locations (e.g., for Super Admin)
      locations = await Location.find({ isActive: true }).sort({ name: 1 });
    } else {
      // Only return locations that have at least one admin associated with them (for general users)
      const adminLocationIds = await User.find({ role: 'admin' }).distinct('locationId');
      
      locations = await Location.find({ 
        isActive: true,
        _id: { $in: adminLocationIds }
      }).sort({ name: 1 });
    }

    const transformedLocations = locations.map(loc => ({
      id: loc._id.toString(),
      name: loc.name,
      city: loc.city,
      state: loc.state,
      country: loc.country,
    }));
    res.json(transformedLocations);
  } catch (error) {
    logErrorIfNotConnection('Get locations error', error);
    res.status(500).json({ message: 'Error fetching locations. Please try again later.' });
  }
});

// Get location by ID
router.get('/:id', async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.json({
      id: location._id.toString(),
      name: location.name,
      city: location.city,
      state: location.state,
      country: location.country,
    });
  } catch (error) {
    logErrorIfNotConnection('Get location error', error);
    res.status(500).json({ message: 'Error fetching location. Please try again later.' });
  }
});

// Create location (admin only)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, city, state, country } = req.body;

    const { error: validationError, data: validated } = validateLocationData(name, city, state);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const newLocation = new Location({
      name: validated.name,
      city: validated.city,
      state: validated.state,
      country: country || 'India',
      isActive: true,
    });

    await newLocation.save();
    res.status(201).json({
      id: newLocation._id.toString(),
      name: newLocation.name,
      city: newLocation.city,
      state: newLocation.state,
      country: newLocation.country,
    });
  } catch (error) {
    console.error('Create location error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A location with this name, city, and state already exists.' });
    }
    res.status(500).json({ message: 'Error creating location' });
  }
});

// Update location (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { name, city, state, country, isActive } = req.body;

    const { error: validationError, data: validated } = validateLocationData(name, city, state);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const location = await Location.findByIdAndUpdate(
      req.params.id,
      {
        name: validated.name,
        city: validated.city,
        state: validated.state,
        country: country || 'India',
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    );

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({
      id: location._id.toString(),
      name: location.name,
      city: location.city,
      state: location.state,
      country: location.country,
      isActive: location.isActive,
    });
  } catch (error) {
    console.error('Update location error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'A location with this name, city, and state already exists.' });
    }
    res.status(500).json({ message: 'Error updating location' });
  }
});

// Delete location (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ message: 'Error deleting location' });
  }
});

export default router;



