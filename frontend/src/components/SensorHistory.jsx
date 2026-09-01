import { analyseCrop } from '../utils/analysis';

function SensorHistory({ crop, readings, onClose }) {
  const cropReadings = readings
    .filter(r => r.crop_name === crop.crop_name)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first

  return (
    <div className="modal-backdrop">
      <div className="history-panel">
        <div className="history-header">
          <h2>{crop.crop_name} — Sensor History</h2>
          <button type="button" onClick={onClose}>Close</button>
        </div>

        {cropReadings.map((reading, i) => {
          const result = analyseCrop(crop, reading);
          return (
            <div key={i} className={`history-row condition-${result.condition.replace(/\s+/g, '-')}`}>
              <p className="reading-time">
                {reading.timestamp} {i === 0 && <span className="latest-tag">(latest)</span>}
              </p>
              <p>
                Moisture: {reading.soil_moisture}% &nbsp;
                Temperature: {reading.temperature} C &nbsp;
                Rainfall: {reading.rainfall} mm &nbsp;
                Status: {reading.sensor_status}
              </p>
              <p>
                Condition: <strong>{result.condition}</strong> &nbsp;
                Recommended: {result.recommended_water === 'N/A' ? 'N/A' : `${result.recommended_water} L`} &nbsp;
                Action: {result.action}
              </p>
              {result.alerts.length > 0 && (
                <p className="alerts-line">Alert: {result.alerts.join(', ')}</p>
              )}
              {reading.notes && <p className="reading-notes">Notes: {reading.notes}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SensorHistory;