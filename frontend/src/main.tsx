import { CssBaseline } from '@mui/material';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { AuthProvider } from './auth';

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <CssBaseline />
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
);
