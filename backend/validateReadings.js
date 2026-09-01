const REQUIRED_CROPS = ['Tomato', 'Lettuce', 'Wheat', 'Maize'];
const VALID_STATUSES = ['Online', 'Offline', 'Faulty'];
const REQUIRED_FIELDS = [
  'crop_name', 'timestamp', 'soil_moisture',
  'temperature', 'rainfall', 'sensor_status', 'notes'
];

// Checks if a string is a valid YYYY-MM-DDTHH:mm:ss timestamp
function isValidTimestamp(ts) {
  if (typeof ts !== 'string') return false;
  const pattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
  if (!pattern.test(ts)) return false;

  const [datePart, timePart] = ts.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, min, sec] = timePart.split(':').map(Number);

  const date = new Date(year, month - 1, day, hour, min, sec);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date.getHours() === hour &&
    date.getMinutes() === min &&
    date.getSeconds() === sec
  );
}

// Validates the full sensor readings array structurally.
// Returns { valid: true } or { valid: false, reason: '...' }
function validateReadingsStructure(data) {
  if (!Array.isArray(data)) {
    return { valid: false, reason: 'Top-level value is not an array' };
  }

  if (data.length !== 20) {
    return { valid: false, reason: `Expected 20 readings, got ${data.length}` };
  }

  const cropCounts = { Tomato: 0, Lettuce: 0, Wheat: 0, Maize: 0 };
  const seenTimestampsByCrop = {
    Tomato: new Set(), Lettuce: new Set(), Wheat: new Set(), Maize: new Set()
  };

  for (const reading of data) {
    if (typeof reading !== 'object' || reading === null) {
      return { valid: false, reason: 'A reading is not an object' };
    }

    // Exactly the required fields, no more/fewer
    const keys = Object.keys(reading);
    const hasAllFields = REQUIRED_FIELDS.every(f => keys.includes(f));
    const hasExtraFields = keys.length !== REQUIRED_FIELDS.length;
    if (!hasAllFields || hasExtraFields) {
      return { valid: false, reason: 'A reading is missing required fields or has extra fields' };
    }

    if (!REQUIRED_CROPS.includes(reading.crop_name)) {
      return { valid: false, reason: `Invalid crop_name: ${reading.crop_name}` };
    }

    if (typeof reading.soil_moisture !== 'number') {
      return { valid: false, reason: 'soil_moisture is not a number' };
    }
    if (typeof reading.temperature !== 'number') {
      return { valid: false, reason: 'temperature is not a number' };
    }
    if (typeof reading.rainfall !== 'number') {
      return { valid: false, reason: 'rainfall is not a number' };
    }
    if (typeof reading.notes !== 'string') {
      return { valid: false, reason: 'notes is not a string' };
    }

    if (!isValidTimestamp(reading.timestamp)) {
      return { valid: false, reason: `Invalid timestamp: ${reading.timestamp}` };
    }

    if (!VALID_STATUSES.includes(reading.sensor_status)) {
      return { valid: false, reason: `Invalid sensor_status: ${reading.sensor_status}` };
    }

    // Duplicate timestamp within same crop check
    if (seenTimestampsByCrop[reading.crop_name].has(reading.timestamp)) {
      return { valid: false, reason: `Duplicate timestamp for ${reading.crop_name}: ${reading.timestamp}` };
    }
    seenTimestampsByCrop[reading.crop_name].add(reading.timestamp);

    cropCounts[reading.crop_name]++;
  }

  for (const crop of REQUIRED_CROPS) {
    if (cropCounts[crop] !== 5) {
      return { valid: false, reason: `Expected 5 readings for ${crop}, got ${cropCounts[crop]}` };
    }
  }

  return { valid: true };
}

module.exports = { validateReadingsStructure };