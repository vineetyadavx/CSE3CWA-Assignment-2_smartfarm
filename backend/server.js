const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { validateReadingsStructure } = require('./validateReadings');

const app = express();
const PORT = 3001;
const READINGS_PATH = path.join(__dirname, 'data', 'sensor-readings.json');

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'SmartFarm backend is running' });
});

// GET /api/readings — reads the file fresh every time, validates structurally
app.get('/api/readings', (req, res) => {
  let raw;
  try {
    raw = fs.readFileSync(READINGS_PATH, 'utf-8');
  } catch (err) {
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }

  const result = validateReadingsStructure(data);
  if (!result.valid) {
    console.error('Sensor file validation failed:', result.reason);
    return res.status(500).json({ error: 'Sensor data file is invalid' });
  }

  res.status(200).json(data);
});

// Helper: read and validate the sensor file, return array or null
function getValidatedReadings() {
    try {
      const raw = fs.readFileSync(READINGS_PATH, 'utf-8');
      const data = JSON.parse(raw);
      const result = validateReadingsStructure(data);
      return result.valid ? data : null;
    } catch (err) {
      return null;
    }
  }
  
  // GET /api/crops — return all crop cards
  app.get('/api/crops', (req, res) => {
    try {
      const crops = db.prepare('SELECT * FROM crops ORDER BY id ASC').all();
      res.status(200).json(crops);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // GET /api/crops/:id — return one crop card
  app.get('/api/crops/:id', (req, res) => {
    try {
      const crop = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
      if (!crop) {
        return res.status(404).json({ error: 'Crop card not found' });
      }
      res.status(200).json(crop);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // Shared validation for create/update body fields
  function validateCropFields(body, { requireCropName }) {
    if (requireCropName) {
      if (!body.crop_name || typeof body.crop_name !== 'string') {
        return 'crop_name is required';
      }
    }
  
    if (!body.location || typeof body.location !== 'string' ||
        body.location.length < 1 || body.location.length > 100) {
      return 'location is required';
    }
  
    if (typeof body.target_min !== 'number' || body.target_min < 0 || body.target_min > 100) {
      return 'target_min must be a number between 0 and 100';
    }
  
    if (typeof body.target_max !== 'number' || body.target_max < 0 || body.target_max > 100) {
      return 'target_max must be a number between 0 and 100';
    }
  
    if (body.target_min >= body.target_max) {
      return 'target_min must be less than target_max';
    }
  
    if (typeof body.normal_water !== 'number' || body.normal_water <= 0 || body.normal_water > 10000) {
      return 'normal_water must be a number greater than 0 and at most 10000';
    }
  
    if (body.notes !== undefined && typeof body.notes !== 'string') {
      return 'notes must be a string';
    }
  
    if (body.notes && body.notes.length > 500) {
      return 'notes must be at most 500 characters';
    }
  
    return null;
  }
  
  // POST /api/crops — create a new crop card
  app.post('/api/crops', (req, res) => {
    try {
      const body = req.body;
  
      const fieldError = validateCropFields(body, { requireCropName: true });
      if (fieldError) {
        return res.status(400).json({ error: fieldError });
      }
  
      // crop_name must exist in the valid sensor feed
      const readings = getValidatedReadings();
      if (!readings) {
        return res.status(500).json({ error: 'Sensor data file is invalid' });
      }
      const validCropNames = [...new Set(readings.map(r => r.crop_name))];
      if (!validCropNames.includes(body.crop_name)) {
        return res.status(400).json({ error: 'crop_name does not exist in sensor data' });
      }
  
      // Check duplicate
      const existing = db.prepare('SELECT id FROM crops WHERE crop_name = ?').get(body.crop_name);
      if (existing) {
        return res.status(409).json({ error: 'crop_name already exists' });
      }
  
      const insert = db.prepare(`
        INSERT INTO crops (crop_name, location, target_min, target_max, normal_water, notes)
        VALUES (@crop_name, @location, @target_min, @target_max, @normal_water, @notes)
      `);
      const info = insert.run({
        crop_name: body.crop_name,
        location: body.location,
        target_min: body.target_min,
        target_max: body.target_max,
        normal_water: body.normal_water,
        notes: body.notes || ''
      });
  
      const created = db.prepare('SELECT * FROM crops WHERE id = ?').get(info.lastInsertRowid);
      res.status(201).json(created);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // PUT /api/crops/:id — update allowed fields; crop_name is immutable
  app.put('/api/crops/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Crop card not found' });
      }
  
      const body = req.body;
  
      // crop_name must not change if present
      if (body.crop_name !== undefined && body.crop_name !== existing.crop_name) {
        return res.status(400).json({ error: 'crop_name cannot be changed' });
      }
  
      const fieldError = validateCropFields(body, { requireCropName: false });
      if (fieldError) {
        return res.status(400).json({ error: fieldError });
      }
  
      db.prepare(`
        UPDATE crops
        SET location = @location,
            target_min = @target_min,
            target_max = @target_max,
            normal_water = @normal_water,
            notes = @notes
        WHERE id = @id
      `).run({
        id: req.params.id,
        location: body.location,
        target_min: body.target_min,
        target_max: body.target_max,
        normal_water: body.normal_water,
        notes: body.notes || ''
      });
  
      const updated = db.prepare('SELECT * FROM crops WHERE id = ?').get(req.params.id);
      res.status(200).json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  
  // DELETE /api/crops/:id — delete only the card, never touches sensor JSON
  app.delete('/api/crops/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT id FROM crops WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: 'Crop card not found' });
      }
  
      db.prepare('DELETE FROM crops WHERE id = ?').run(req.params.id);
      res.status(200).json({ deleted: true, id: Number(req.params.id) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

app.listen(PORT, () => {
  console.log(`SmartFarm backend listening on http://localhost:${PORT}`);
});