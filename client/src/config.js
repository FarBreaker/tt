// Get the current host (works for both localhost and LAN access)
const getApiBaseUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  // If accessing via localhost, use localhost for API
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//localhost:3001`;
  }
  
  // Otherwise, use the same hostname as the frontend
  return `${protocol}//${hostname}:3001`;
};

export const API_BASE = getApiBaseUrl();
export const SOCKET_URL = API_BASE;