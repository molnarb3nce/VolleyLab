import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Default dev port; backend allows http://localhost:5173 unless CORS_ORIGIN is set.
export default defineConfig(({ mode }) => {
  if (mode === 'production' && !process.env.VITE_API_URL?.trim()) {
    throw new Error(
      'VITE_API_URL is required for production builds (Railway: set on the web service and mark Available at build time).',
    );
  }
  return { plugins: [react()], server: { port: 5173, strictPort: true } };
});
