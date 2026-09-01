// Returns the reading with the greatest timestamp for a given crop_name.
// Returns null if there are no matches.
export function getLatestReading(cropName, readings) {
    const matches = readings.filter(r => r.crop_name === cropName);
    if (matches.length === 0) return null;
    return [...matches].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  }
  
  // Returns unique crop_name values from readings that do NOT already
  // have a Crop Card, for the Add Crop Card dropdown.
  export function getAvailableCropNames(readings, crops) {
    const usedNames = new Set(crops.map(c => c.crop_name));
    const allNames = [...new Set(readings.map(r => r.crop_name))];
    return allNames.filter(name => !usedNames.has(name));
  }
  
  // Analyses a single Crop Card against a single reading (its latest, or
  // any reading when used in Sensor History) and returns the full result.
  export function analyseCrop(cropCard, reading) {
    const base = {
      crop: cropCard,
      latest_reading: reading || null,
      condition: null,
      recommended_water: null,
      alerts: [],
      action: null
    };
  
    // No reading available at all (shouldn't normally happen per spec,
    // since a structurally valid file guarantees 5 readings per crop —
    // but guard anyway in case sensor data is unavailable).
    if (!reading) {
      return {
        ...base,
        condition: 'Sensor Feed Unavailable',
        recommended_water: 'N/A',
        action: 'N/A'
      };
    }
  
    const { soil_moisture, temperature, rainfall, sensor_status } = reading;
  
    // Priority 1: Sensor Problem
    if (sensor_status === 'Offline' || sensor_status === 'Faulty') {
      return {
        ...base,
        condition: 'Sensor Problem',
        recommended_water: 'N/A',
        alerts: ['Check sensor'],
        action: 'Check sensor'
      };
    }
  
    // Priority 2: Invalid Data (Online reading, out-of-range values)
    const moistureInvalid = soil_moisture < 0 || soil_moisture > 100;
    const temperatureInvalid = temperature < 0 || temperature > 50;
    const rainfallInvalid = rainfall < 0 || rainfall > 50;
  
    if (moistureInvalid || temperatureInvalid || rainfallInvalid) {
      const invalidFields = [];
      if (moistureInvalid) invalidFields.push('soil_moisture');
      if (temperatureInvalid) invalidFields.push('temperature');
      if (rainfallInvalid) invalidFields.push('rainfall');
  
      return {
        ...base,
        condition: 'Invalid Data',
        recommended_water: 'N/A',
        alerts: invalidFields,
        action: 'Check reading'
      };
    }
  
    // From here on, the reading is a valid Online reading — check
    // main condition (priority 3-5), then additional alerts.
    let condition;
    let recommended_water;
    let action;
  
    if (soil_moisture < cropCard.target_min) {
      condition = 'Dry';
      recommended_water = cropCard.normal_water;
      action = 'Water crop';
    } else if (soil_moisture > cropCard.target_max) {
      condition = 'Too Wet';
      recommended_water = 0;
      action = 'Stop watering';
    } else {
      condition = 'Healthy';
      recommended_water = 0;
      action = 'Monitor';
    }
  
    const alerts = [];
    if (temperature > 35) {
      alerts.push('High temperature');
    }
    if (rainfall >= 5) {
      alerts.push('Rain detected');
    }
  
    return {
      ...base,
      condition,
      recommended_water,
      alerts,
      action
    };
  }
  
  // Calculates Overall Farm Status from an array of analysed results
  // (each result being the output of analyseCrop).
  export function calculateFarmStatus(results, sensorAvailable) {
    if (results.length === 0) {
      return 'No Crops';
    }
  
    if (!sensorAvailable) {
      return 'Sensor Feed Unavailable';
    }
  
    const hasCritical = results.some(
      r => r.condition === 'Sensor Problem' || r.condition === 'Invalid Data'
    );
    if (hasCritical) {
      return 'Critical';
    }
  
    const hasWatch = results.some(
      r => r.condition === 'Dry' ||
           r.condition === 'Too Wet' ||
           r.alerts.includes('High temperature')
    );
    if (hasWatch) {
      return 'Watch';
    }
  
    return 'Normal';
  }