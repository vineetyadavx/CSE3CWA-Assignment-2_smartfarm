const BASE_URL = 'http://localhost:3001/api';

async function handleResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    const message = data && data.error ? data.error : 'Request failed';
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function getCrops() {
  const res = await fetch(`${BASE_URL}/crops`);
  return handleResponse(res);
}

export async function getCrop(id) {
  const res = await fetch(`${BASE_URL}/crops/${id}`);
  return handleResponse(res);
}

export async function createCrop(cropData) {
  const res = await fetch(`${BASE_URL}/crops`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cropData)
  });
  return handleResponse(res);
}

export async function updateCrop(id, cropData) {
  const res = await fetch(`${BASE_URL}/crops/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cropData)
  });
  return handleResponse(res);
}

export async function deleteCrop(id) {
  const res = await fetch(`${BASE_URL}/crops/${id}`, {
    method: 'DELETE'
  });
  return handleResponse(res);
}

export async function getReadings() {
  const res = await fetch(`${BASE_URL}/readings`);
  return handleResponse(res);
}