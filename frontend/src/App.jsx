import { useState, useEffect, useCallback } from 'react';
import { getCrops, getReadings, createCrop, updateCrop, deleteCrop } from './services/api';
import { getLatestReading, analyseCrop, calculateFarmStatus, getAvailableCropNames } from './utils/analysis';
import CropCard from './components/CropCard';
import CreateCropForm from './components/CreateCropForm';
import EditCropForm from './components/EditCropForm';
import ConfirmDialog from './components/ConfirmDialog';
import SensorHistory from './components/SensorHistory';
import './App.css';

function App() {
  const [crops, setCrops] = useState([]);
  const [cropsLoading, setCropsLoading] = useState(true);
  const [cropsError, setCropsError] = useState(null);
  const [editingCrop, setEditingCrop] = useState(null);
  const [editSuccess, setEditSuccess] = useState(null);
  const [deletingCrop, setDeletingCrop] = useState(null);
  const [deleteSuccess, setDeleteSuccess] = useState(null);
  const [historyCrop, setHistoryCrop] = useState(null);

  const [readings, setReadings] = useState(null);
  const [sensorAvailable, setSensorAvailable] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [refreshError, setRefreshError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(null);

  const loadCrops = useCallback(async () => {
    setCropsLoading(true);
    setCropsError(null);
    try {
      const data = await getCrops();
      setCrops(data);
    } catch (err) {
      setCropsError(err.message);
    } finally {
      setCropsLoading(false);
    }
  }, []);

  const loadReadings = useCallback(async () => {
    try {
      const data = await getReadings();
      setReadings(data);
      setSensorAvailable(true);
      setLastRefresh(new Date());
      setRefreshError(null);
    } catch (err) {
      setRefreshError(err.message);
    }
  }, []);

  useEffect(() => {
    loadCrops();
    loadReadings();
  }, [loadCrops, loadReadings]);

  const handleRefresh = () => {
    loadReadings();
  };

  const handleCreateCrop = async (cropData) => {
    await createCrop(cropData);
    await loadCrops();
    setShowCreateForm(false);
    setCreateSuccess(`${cropData.crop_name} card created successfully`);
    setTimeout(() => setCreateSuccess(null), 3000);
  };

  const handleEditCrop = async (id, cropData) => {
    await updateCrop(id, cropData);
    await loadCrops();
    setEditingCrop(null);
    setEditSuccess('Crop card updated successfully');
    setTimeout(() => setEditSuccess(null), 3000);
  };

  const handleDeleteCrop = async () => {
    const cropName = deletingCrop.crop_name;
    await deleteCrop(deletingCrop.id);
    await loadCrops();
    setDeletingCrop(null);
    setDeleteSuccess(`${cropName} card deleted successfully`);
    setTimeout(() => setDeleteSuccess(null), 3000);
  };

  // Build analysis results for status calculation
  let analysisResults = [];
  let farmStatus = 'No Crops';
  const availableNames = readings ? getAvailableCropNames(readings, crops) : [];

  if (crops.length > 0) {
    analysisResults = crops.map(crop => {
      const latest = readings ? getLatestReading(crop.crop_name, readings) : null;
      return analyseCrop(crop, latest);
    });
    farmStatus = calculateFarmStatus(analysisResults, sensorAvailable);
  }

  const lastRefreshDisplay = lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never';

  return (
    <div className="app">
      <header className="summary-bar">
        <h1>SmartFarm Crop Dashboard</h1>
        <div className="summary-stats">
          <span>Overall Status: <strong className={`status-${farmStatus.replace(/\s+/g, '-')}`}>{farmStatus}</strong></span>
          <span>Crop cards: {crops.length}</span>
          <span>Last sensor refresh: {lastRefreshDisplay}</span>
        </div>
        <div className="summary-actions">
          <button type="button" disabled={!sensorAvailable} onClick={() => setShowCreateForm(true)}>Add Crop Card</button>
          <button type="button" onClick={handleRefresh}>Refresh Sensor Data</button>
        </div>
        {refreshError && <p className="error-banner">Refresh failed: {refreshError}</p>}
      </header>

      <main>
        {cropsLoading && <p>Loading crop cards...</p>}
        {cropsError && (
          <div className="error-banner">
            <p>Failed to load crop cards: {cropsError}</p>
            <button type="button" onClick={loadCrops}>Retry</button>
          </div>
        )}
        {!cropsLoading && !cropsError && crops.length === 0 && (
          <p>No crop cards yet. Click "Add Crop Card" to create one.</p>
        )}
        {!cropsLoading && !cropsError && crops.length > 0 && (
          <div className="crop-grid">
            {analysisResults.map(result => (
              <CropCard
                key={result.crop.id}
                result={result}
                onEdit={(crop) => setEditingCrop(crop)}
                onDelete={(crop) => setDeletingCrop(crop)}
                onViewHistory={(crop) => setHistoryCrop(crop)}
              />
            ))}
          </div>
        )}
      </main>

      {createSuccess && <p className="success-banner">{createSuccess}</p>}
      {editSuccess && <p className="success-banner">{editSuccess}</p>}
      {deleteSuccess && <p className="success-banner">{deleteSuccess}</p>}

      {showCreateForm && (
        <CreateCropForm
          availableNames={availableNames}
          onSubmit={handleCreateCrop}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {editingCrop && (
        <EditCropForm
          crop={editingCrop}
          onSubmit={handleEditCrop}
          onCancel={() => setEditingCrop(null)}
        />
      )}

      {deletingCrop && (
        <ConfirmDialog
          message={`Delete the ${deletingCrop.crop_name} card? Sensor data for ${deletingCrop.crop_name} will not be affected.`}
          onConfirm={handleDeleteCrop}
          onCancel={() => setDeletingCrop(null)}
        />
      )}

      {historyCrop && readings && (
        <SensorHistory
          crop={historyCrop}
          readings={readings}
          onClose={() => setHistoryCrop(null)}
        />
      )}
    </div>
  );
}

export default App;