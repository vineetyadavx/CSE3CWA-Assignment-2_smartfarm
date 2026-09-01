import { useState } from 'react';

function CreateCropForm({ availableNames, onSubmit, onCancel }) {
  const [cropName, setCropName] = useState('');
  const [location, setLocation] = useState('');
  const [targetMin, setTargetMin] = useState('');
  const [targetMax, setTargetMax] = useState('');
  const [normalWater, setNormalWater] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!cropName) {
      setError('Please select a crop name');
      return;
    }
    if (!location.trim()) {
      setError('Location is required');
      return;
    }

    const min = Number(targetMin);
    const max = Number(targetMax);
    const water = Number(normalWater);

    if (Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(water)) {
      setError('Target range and normal water must be numbers');
      return;
    }
    if (min >= max) {
      setError('Target min must be less than target max');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        crop_name: cropName,
        location: location.trim(),
        target_min: min,
        target_max: max,
        normal_water: water,
        notes: notes.trim()
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <form className="crop-form" onSubmit={handleSubmit}>
        <h2>Add Crop Card</h2>

        <label>
          Crop name
          <select value={cropName} onChange={(e) => setCropName(e.target.value)} required>
            <option value="">-- select --</option>
            {availableNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>

        <label>
          Location
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            maxLength={100}
            required
          />
        </label>

        <label>
          Target min (%)
          <input
            type="number"
            value={targetMin}
            onChange={(e) => setTargetMin(e.target.value)}
            min={0}
            max={100}
            required
          />
        </label>

        <label>
          Target max (%)
          <input
            type="number"
            value={targetMax}
            onChange={(e) => setTargetMax(e.target.value)}
            min={0}
            max={100}
            required
          />
        </label>

        <label>
          Normal water (L)
          <input
            type="number"
            value={normalWater}
            onChange={(e) => setNormalWater(e.target.value)}
            min={1}
            max={10000}
            required
          />
        </label>

        <label>
          Notes (optional)
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="form-buttons">
          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Create'}
          </button>
          <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default CreateCropForm;