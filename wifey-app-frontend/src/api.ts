const port = import.meta.env.VITE_BACKEND_PORT ?? '3000'
export const API_BASE = `${window.location.protocol}//${window.location.hostname}:${port}`
export const API = `${API_BASE}/api`
