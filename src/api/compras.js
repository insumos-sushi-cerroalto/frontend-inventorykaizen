import apiClient from './config';

// Obtener todas las compras
export const fetchCompras = async () => {
  try {
    const response = await apiClient.get('/api/compras/');
    return response.data.results ?? response.data;
  } catch (error) {
    console.error('Error al obtener compras:', error);
    throw error;
  }
};

export const fetchAllCompras = async () => {
  try {
    let allResults = [];
    let nextUrl = '/api/compras/';

    while (nextUrl) {
      const response = await apiClient.get(nextUrl);
      const data = response.data;
      const pageResults = Array.isArray(data) ? data : data.results ?? [];
      allResults = allResults.concat(pageResults);
      nextUrl = data.next || null;
    }

    return allResults;
  } catch (error) {
    console.error('Error al obtener todas las compras:', error);
    throw error;
  }
};

// Crear una nueva compra
export const createCompra = async (compraData) => {
  try {
    const response = await apiClient.post('/api/compras/', compraData);
    return response.data;
  } catch (error) {
    console.error('Error al crear compra:', error);
    throw error;
  }
};

// Actualizar una compra existente
export const updateCompra = async (id, compraData) => {
  try {
    const response = await apiClient.put(`/api/compras/${id}/`, compraData);
    return response.data;
  } catch (error) {
    console.error('Error al actualizar compra:', error);
    throw error;
  }
};

// Eliminar una compra
export const deleteCompra = async (id) => {
  try {
    await apiClient.delete(`/api/compras/${id}/`);
  } catch (error) {
    console.error('Error al eliminar compra:', error);
    throw error;
  }
};
