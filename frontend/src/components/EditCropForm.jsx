import { useState } from 'react';

function EditCropForm({ crop, onSubmit, onCancel }) {
  const [location, setLocation] = useState(crop.location);
  const [targetMin, setTargetMin] = useState(crop.target_min);
  const [targetMax, setTargetMax] = useState(crop.target_max);
  const [normalWater, setNormalWater] = useState(crop.normal_water);
  const [notes, setNotes] = useState(crop.notes || '');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
      await onSubmit(crop.id, {
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
        <h2>Edit Crop Card</h2>

        <label>
          Crop name
          <input type="text" value={crop.crop_name} disabled readOnly />
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
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

export default EditCropForm;