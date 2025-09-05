const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? '' // Use relative URLs in production
  : 'http://localhost:5001'; // Use full URL in development

export const apiUrl = (path) => `${API_BASE_URL}${path}`;

export const fetchApi = async (path, options = {}) => {
  const url = apiUrl(path);
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  return response;
};
