/**
 * API Configuration
 * Dynamically determines the backend API URL based on environment
 */

const STORAGE_KEY = 'thermal_printer_api_url';

/**
 * Get the API base URL
 * Priority:
 * 1. LocalStorage (user-configured)
 * 2. Environment variable (VITE_API_URL)
 * 3. Same host as frontend (for network deployment)
 * 4. Localhost (for local development)
 */
export function getApiBaseUrl(): string {
  // Check localStorage first (user preference)
  const storedUrl = localStorage.getItem(STORAGE_KEY);
  if (storedUrl) {
    return storedUrl;
  }
  
  // Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in production (built app)
  if (import.meta.env.PROD) {
    // Use the same host as the frontend
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = 3001; // Backend port
    return `${protocol}//${hostname}:${port}`;
  }
  
  // Development mode - use localhost
  return 'http://localhost:3001';
}

/**
 * Set custom API URL and save to localStorage
 */
export function setApiBaseUrl(url: string): void {
  if (url && url.trim()) {
    localStorage.setItem(STORAGE_KEY, url.trim());
  }
}

/**
 * Clear custom API URL from localStorage
 */
export function clearApiBaseUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get the default API URL (without localStorage override)
 */
export function getDefaultApiUrl(): string {
  // Check for environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check if we're in production
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = 3001;
    return `${protocol}//${hostname}:${port}`;
  }
  
  // Development mode
  return 'http://localhost:3001';
}

/**
 * Check if using custom URL from localStorage
 */
export function hasCustomApiUrl(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

// Get initial API URL
let apiBaseUrl = getApiBaseUrl();

/**
 * Get current API base URL (can be updated at runtime)
 */
export function getCurrentApiUrl(): string {
  return apiBaseUrl;
}

/**
 * Update the API base URL at runtime
 */
export function updateApiBaseUrl(url: string): void {
  apiBaseUrl = url;
  setApiBaseUrl(url);
}

export const API_BASE_URL = apiBaseUrl;

// Export API endpoints for easy access
export const API_ENDPOINTS = {
  // Health
  health: `${API_BASE_URL}/api/health`,
  status: `${API_BASE_URL}/api/printer/status`,
  
  // Serial/COM Port
  serialList: `${API_BASE_URL}/api/printer/serial/list`,
  serialConnect: `${API_BASE_URL}/api/printer/serial/connect`,
  
  // Network Printer
  discover: `${API_BASE_URL}/api/printer/discover`,
  connect: `${API_BASE_URL}/api/printer/connect`,
  
  // Common
  disconnect: `${API_BASE_URL}/api/printer/disconnect`,
  print: `${API_BASE_URL}/api/printer/print`,
};

// Log the API URL in development
if (import.meta.env.DEV) {
  console.log('🌐 API Base URL:', API_BASE_URL);
}

