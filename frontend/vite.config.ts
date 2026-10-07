import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Port 5173 is the only origin the backend allows via CORS.
export default defineConfig({ plugins: [react()], server: { port: 5173, strictPort: true } });
