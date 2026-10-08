import { SxProps, Theme } from '@mui/material';

/** Frosted “liquid glass” panel surface. */
export const glass: SxProps<Theme> = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.04) 45%, rgba(255,255,255,0.02) 100%)',
  backdropFilter: 'blur(22px) saturate(180%)',
  WebkitBackdropFilter: 'blur(22px) saturate(180%)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
};

export const glassSubtle: SxProps<Theme> = {
  ...glass,
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
  boxShadow: '0 8px 28px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
};

export const gradientBrandText: SxProps<Theme> = {
  background: 'linear-gradient(120deg, #c4b5fd 0%, #67e8f9 45%, #6ee7b7 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
};

export const gradientButton: SxProps<Theme> = {
  background: 'linear-gradient(135deg, #6366f1 0%, #0891b2 50%, #10b981 100%)',
  backgroundSize: '200% 200%',
  transition: 'background-position 0.4s ease, box-shadow 0.2s ease',
  boxShadow: '0 4px 24px rgba(99, 102, 241, 0.35)',
  '&:hover': {
    backgroundPosition: '100% 50%',
    boxShadow: '0 6px 28px rgba(34, 211, 238, 0.4)',
  },
};
