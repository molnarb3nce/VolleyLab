import { Box, Paper, PaperProps } from '@mui/material';

/** Horizontal scroll wrapper for wide tables on small screens. */
export function TableScroll({ children, sx, ...paperProps }: PaperProps) {
  return (
    <Paper
      {...paperProps}
      sx={{
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        ...sx,
      }}
    >
      <Box component="div" sx={{ minWidth: 0, width: 'max-content', maxWidth: '100%' }}>
        {children}
      </Box>
    </Paper>
  );
}
