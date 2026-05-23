const API_BASE_URL = '/api';

export const fetchAPI = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Fetch Error:', error);
    throw error;
  }
};
