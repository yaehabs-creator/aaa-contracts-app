
export const APP_CONFIG = {
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001',
  OPENCLAW_GATEWAY: import.meta.env.VITE_OPENCLAW_GATEWAY || 'http://localhost:8001',
  DOCLING_SERVER: import.meta.env.VITE_DOCLING_SERVER || 'http://localhost:8000',
  FEATURES: {
    OPENCLAW_ACTIVE_BY_DEFAULT: true,
  }
};
