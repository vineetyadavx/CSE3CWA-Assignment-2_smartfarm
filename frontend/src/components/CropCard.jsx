function CropCard({ result, onEdit, onDelete, onViewHistory }) {
    const { crop, latest_reading, condition, recommended_water, alerts, action } = result;
  
    return (
      <div className={`crop-card condition-${condition.replace(/\s+/g, '-')}`}>
        <h3>{crop.crop_name} - {crop.location}</h3>
  
        {latest_reading ? (
          <>
            <p className="reading-time">Latest: {latest_reading.timestamp}</p>
            <p>
              Moisture: {latest_reading.soil_moisture}% &nbsp;
              Temperature: {latest_reading.temperature} C &nbsp;
              Rainfall: {latest_reading.rainfall} mm
            </p>
          </>
        ) : (
          <p className="reading-time">No sensor reading available</p>
        )}
  
        <p className="condition-line">
          Condition: <strong>{condition}</strong> &nbsp;
          Recommended: {recommended_water === 'N/A' ? 'N/A' : `${recommended_water} L`}
        </p>
  
        {alerts.length > 0 && (
          <p className="alerts-line">Alert: {alerts.join(', ')}</p>
        )}
  
        <p className="action-line">Action: {action}</p>
  
        <div className="card-settings">
          <p>Target range: {crop.target_min}% - {crop.target_max}%</p>
          <p>Normal water: {crop.normal_water} L</p>
          {crop.notes && <p>Notes: {crop.notes}</p>}
        </div>
  
        <div className="card-buttons">
          <button type="button" onClick={() => onEdit(crop)}>Edit</button>
          <button type="button" onClick={() => onDelete(crop)}>Delete</button>
          <button type="button" onClick={() => onViewHistory(crop)}>View Sensor History</button>
        </div>
      </div>
    );
  }
  
  export default CropCard;