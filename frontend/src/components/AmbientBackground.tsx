import { Box } from '@mui/material';
import { ReactNode } from 'react';

const ORBS = [
  { w: 420, h: 420, top: '-8%', left: '-6%', color: 'rgba(99, 102, 241, 0.55)', anim: 'orbDrift1', dur: '22s' },
  { w: 360, h: 360, top: '42%', left: '72%', color: 'rgba(34, 211, 238, 0.45)', anim: 'orbDrift2', dur: '26s' },
  { w: 280, h: 280, top: '68%', left: '8%', color: 'rgba(167, 139, 250, 0.4)', anim: 'orbDrift3', dur: '20s' },
  { w: 200, h: 200, top: '12%', left: '58%', color: 'rgba(52, 211, 153, 0.35)', anim: 'orbDrift2', dur: '18s' },
] as const;

/** Full-viewport dark canvas with soft gradient orbs (glass UI sits on top). */
export function AmbientBackground({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        bgcolor: 'background.default',
        overflow: 'hidden',
        '@keyframes orbDrift1': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '33%': { transform: 'translate(40px, 30px) scale(1.08)' },
          '66%': { transform: 'translate(-20px, 50px) scale(0.95)' },
        },
        '@keyframes orbDrift2': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(-35px, -45px) scale(1.06)' },
        },
        '@keyframes orbDrift3': {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '40%': { transform: 'translate(25px, -30px) scale(1.1)' },
          '80%': { transform: 'translate(-30px, 15px) scale(0.92)' },
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: `
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99, 102, 241, 0.22), transparent 55%),
            radial-gradient(ellipse 60% 50% at 100% 50%, rgba(6, 182, 212, 0.12), transparent 50%),
            linear-gradient(180deg, #05070f 0%, #0a0f1a 40%, #060912 100%)
          `,
        }}
      />
      {ORBS.map((o, i) => (
        <Box
          key={i}
          aria-hidden
          sx={{
            position: 'fixed',
            width: o.w,
            height: o.h,
            top: o.top,
            left: o.left,
            borderRadius: '50%',
            background: `radial-gradient(circle at 30% 30%, ${o.color}, transparent 70%)`,
            filter: 'blur(48px)',
            opacity: 0.9,
            animation: `${o.anim} ${o.dur} ease-in-out infinite`,
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />
      ))}
      <Box sx={{ position: 'relative', zIndex: 1 }}>{children}</Box>
    </Box>
  );
}
