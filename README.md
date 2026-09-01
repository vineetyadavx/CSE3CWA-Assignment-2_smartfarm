# SmartFarm Crop IoT Dashboard

A full-stack crop monitoring dashboard built for CSE3CWA/CSE5006 Assignment 2. Farm staff manage Crop Cards in SQLite, and a simulated read-only sensor feed (JSON) is joined to those cards by `crop_name` to show live crop condition, recommended watering, and alerts.

## Tech Stack

- Frontend: React (Vite)
- Backend: Node.js + Express
- Database: SQLite (via better-sqlite3), used for Crop Cards only
- Sensor source: static, read-only `backend/data/sensor-readings.json`

## Installation and Run Steps

The backend and frontend run as two separate applications during development.

**Backend:**

cd backend
npm install
node server.js

Backend runs at: **http://localhost:3001**

**Frontend (in a separate terminal):**

cd frontend
npm install
npm run dev

Frontend runs at: **http://localhost:5173** (Vite will pick the next available port, e.g. 5174, if 5173 is in use — check the terminal output).

CORS is enabled on the backend so the frontend can call it directly across ports.

## Database Creation and Seeding

On backend startup, `db.js` creates the `crops` table if it doesn't already exist (schema matches Section 17 of the assignment spec exactly, including all CHECK constraints). If the table is empty, it seeds exactly three Crop Cards: **Tomato**, **Lettuce**, and **Wheat**. **Maize is deliberately not seeded** — it must be created through the UI, which also lets a marker test the Create flow immediately.

Restarting the backend does not duplicate seed data; the seed function checks the row count first and skips seeding if any records already exist.

The SQLite file (`backend/smartfarm.db`) is created automatically on first run.

## API Routes and Error Format

| Method | Route | Purpose |
|---|---|---|
| GET | /api/crops | Return all Crop Cards |
| GET | /api/crops/:id | Return one Crop Card |
| POST | /api/crops | Create a Crop Card |
| PUT | /api/crops/:id | Update a Crop Card (crop_name immutable) |
| DELETE | /api/crops/:id | Delete a Crop Card only |
| GET | /api/readings | Read, structurally validate, and return the sensor JSON |

Every failed response uses a consistent JSON error format:
```json
{ "error": "Clear message describing the problem" }
```

Key error cases: missing/invalid fields → 400, `crop_name` not in the sensor feed → 400, attempt to change `crop_name` → 400, duplicate `crop_name` → 409, Crop Card not found → 404, structurally invalid sensor file → 500, unexpected server error → 500.

## Data Ownership

The application deliberately keeps two data sources separate:

- **Crop Cards** live in SQLite and are fully user-managed (Create, Read, Update, Delete) through the Express API.
- **Sensor readings** live in `backend/data/sensor-readings.json` and are **read-only** inside the application. There are no POST/PUT/DELETE routes for sensor data, and Crop Card CRUD never modifies this file — deleting a Crop Card only removes the SQLite row, leaving the sensor readings for that crop name untouched (verified: deleting and re-creating a Crop Card correctly re-matches the same JSON readings).
- **Dashboard results** (condition, recommended water, alerts, action, Overall Farm Status) are never stored — they're calculated in React state on every render from the current Crop Cards and sensor readings.

## crop_name Matching

`crop_name` is the single join key between a Crop Card and its sensor readings. Matching is **exact and case-sensitive** — `"Tomato"` matches `"Tomato"` but not `"tomato"`. This is enforced by simple strict equality (`r.crop_name === cropName`) in `getLatestReading()`; no normalization, trimming, or case-folding is applied, matching the spec's requirement exactly.

## Latest-Timestamp Selection

For a given crop, all matching readings are filtered from the full 20-reading array, then sorted by timestamp descending using string comparison (`localeCompare`), since the required `YYYY-MM-DDTHH:mm:ss` format sorts correctly as a string. The greatest timestamp is selected as the "latest" reading — the array's storage order is never assumed to reflect chronological order (and in our `sensor-readings.json`, the 20 readings are intentionally shuffled to prove this).

## Dashboard Decision Priority

`analyseCrop()` in `frontend/src/utils/analysis.js` applies the main-condition checks top to bottom, stopping at the first match:

1. `sensor_status` is Offline or Faulty → **Sensor Problem** (recommended water N/A, action "Check sensor")
2. Online reading with moisture/temperature/rainfall outside its normal business range → **Invalid Data** (recommended water N/A, action "Check reading")
3. `soil_moisture < target_min` → **Dry** (recommended water = normal_water, action "Water crop")
4. `target_min <= soil_moisture <= target_max` → **Healthy** (recommended water = 0, action "Monitor")
5. `soil_moisture > target_max` → **Too Wet** (recommended water = 0, action "Stop watering")

Additional alerts (checked only for a valid Online reading, and never changing recommended water): temperature > 35°C adds "High temperature"; rainfall >= 5mm adds "Rain detected". Boundary values (moisture exactly at target_min/target_max, temperature exactly 35, rainfall exactly 5) are handled per spec — verified by code inspection and testing.

Overall Farm Status is calculated from all current Crop Card results: No Crops (empty list) → Sensor Feed Unavailable (cards exist, no successful sensor fetch yet) → Critical (any Sensor Problem or Invalid Data) → Watch (any Dry, Too Wet, or High temperature) → Normal (otherwise).

## AI Use

Claude (via Cursor's chat interface) was used to assist with **debugging and complex logic** — specifically the sensor validation rules, the crop-matching/latest-timestamp functions, and the dashboard decision-table logic in `analysis.js`. No Cursor AI agents were used at any point in this project. The initial project boilerplate, component structure, and overall build were written and assembled by me, with Claude used as a debugging and logic-design aid rather than as an autonomous coder.

**Final AI prompt used to generate the sensor readings:**
> "Generate a valid JSON array containing exactly 20 simulated SmartFarm sensor readings. Use these crop_name values exactly and create exactly 5 readings for each: Tomato, Lettuce, Wheat, Maize. Every object must contain exactly these fields: crop_name, timestamp, soil_moisture, temperature, rainfall, sensor_status, notes. Use timestamps in YYYY-MM-DDTHH:mm:ss format. Timestamps must be distinct within each crop. The same timestamp may be used by different crops. Mix the array order so the latest reading is not always the last object. Use sensor_status only as Online, Offline or Faulty. Most numeric values must be realistic: soil_moisture 0-100, temperature 0-50, rainfall 0-50. Include exactly one structurally valid older reading with one deliberately out-of-range numeric value. That invalid reading must not be the latest reading for its crop. Make the latest readings produce these cases with the default Crop Card settings: latest Tomato: Online, Dry, temperature above 35 C; latest Lettuce: Online and Healthy; latest Wheat: Online, Too Wet, rainfall at least 5 mm; latest Maize: sensor_status Faulty."

**Checks and corrections made to the AI-generated data:** After generating the 20 readings, I manually verified: exact counts (5 per crop, 20 total), that every object had exactly the 7 required fields with correct types, that timestamps were distinct within each crop and validated with a Node script confirming `Total: 20, Tomato: 5, Lettuce: 5, Wheat: 5, Maize: 5`. One correction made: the initial AI-proposed reading set did not clearly separate the intentional invalid reading from the "latest" reading for Wheat — I corrected this by explicitly placing the invalid moisture-120 reading on an older timestamp (`2026-08-01T09:00:00`) and confirming Wheat's actual latest reading (`2026-08-05T09:00:00`) was a separate, valid, Too-Wet reading with rainfall ≥ 5mm as required.

**crop_name uniqueness and exact matching verification:** Verified via the SQLite `UNIQUE` constraint on `crop_name` plus a backend duplicate check returning HTTP 409, and tested manually by attempting to create a duplicate Maize card (rejected correctly). Case-sensitivity was verified by code inspection of the strict equality match in `getLatestReading()`.

**Latest-timestamp verification:** Verified by checking that each crop's true latest reading (by calendar date/time) was correctly identified and displayed on its dashboard card, even with the JSON array in shuffled order — confirmed via live testing in Phase 5 and cross-checked against the raw `/api/readings` output.

**One implementation decision I made independently:** While testing the Edit function, I temporarily changed Tomato's `target_min` from 55 to 40 to verify the condition recalculated correctly (Dry → Healthy). I then made the decision to reset it back to the original seeded value of 55 afterward, to keep the crop data consistent with the sensor readings I had specifically designed to match the spec's worked examples (Section 15) for the demonstration video.

## Project Limitation

This project does not include an automated test suite. All testing was performed manually against the full acceptance test checklist (Section 18 of the assignment spec) — covering initial load, CRUD operations, matching/timestamp logic, the decision table, boundary conditions, and all loading/refresh/failure states. Given more time, unit tests for the pure functions in `analysis.js` (which don't depend on React or the network) would be a natural next step, since they're the easiest part of the codebase to test in isolation.