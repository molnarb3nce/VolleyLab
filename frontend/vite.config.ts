import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Default dev port; backend allows http://localhost:5173 unless CORS_ORIGIN is set.
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true } });
