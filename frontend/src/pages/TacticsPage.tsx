import AddIcon from '@mui/icons-material/Add';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FORMATION_LABEL, FORMATIONS } from '../constants';
import { gradientBrandText } from '../glass';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { Formation, Tactic } from '../types';

export function TacticsPage() {
  const navigate = useNavigate();
  const { data: tactics, error: loadError, reload } = useLoad(() => api.get<Tactic[]>('/tactics'), []);
  const { error, run } = useAction();
  const [form, setForm] = useState({
    name: '',
    formation: 'FIVE_ONE' as Formation,
    opponentFormation: 'FIVE_ONE' as Formation,
  });

  const create = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const tactic = await api.post<Tactic>('/tactics', form);
      navigate(`/tactics/${tactic.id}`);
    });
  };

  const formationField = (label: string, field: 'formation' | 'opponentFormation') => (
    <TextField
      size="small"
      select
      label={label}
      sx={{ width: { xs: '100%', sm: 150 } }}
      value={form[field]}
      onChange={(e) => setForm({ ...form, [field]: e.target.value as Formation })}
    >
      {FORMATIONS.map((f) => (
        <MenuItem key={f} value={f}>
          {FORMATION_LABEL[f]}
        </MenuItem>
      ))}
    </TextField>
  );

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h4" gutterBottom sx={gradientBrandText}>
          Tactics
        </Typography>
        <Typography color="text.secondary">
          Draw plays on the court, then preview and validate them with your roster.
        </Typography>
      </Box>
      <ErrorAlert error={loadError || error} />

      <Paper component="form" onSubmit={create} sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          New tactic
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap alignItems={{ sm: 'center' }}>
          <TextField
            size="small"
            label="Name"
            fullWidth
            sx={{ flex: { sm: 1 }, minWidth: { sm: 160 } }}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          {formationField('Our formation', 'formation')}
          {formationField('Opponent', 'opponentFormation')}
          <Button type="submit" variant="contained" startIcon={<AddIcon />} disabled={!form.name.trim()}>
            Create
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={1}>
        {tactics?.length === 0 && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            No tactics yet — create one above.
          </Typography>
        )}
        {tactics?.map((t) => (
          <Paper
            key={t.id}
            sx={{
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: '0 16px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(129,140,248,0.2)',
              },
            }}
          >
            <Stack direction="row" alignItems="center" sx={{ px: 1, py: 0.5 }}>
              <Box
                component={Link}
                to={`/tactics/${t.id}`}
                sx={{
                  flex: 1,
                  minWidth: 0,
                  px: 1.5,
                  py: 1,
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <Typography fontWeight={600} noWrap>
                  {t.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {FORMATION_LABEL[t.formation]} vs {FORMATION_LABEL[t.opponentFormation]} · {t._count?.steps ?? 0}{' '}
                  steps
                </Typography>
              </Box>
              <IconButton component={Link} to={`/tactics/${t.id}`} aria-label="Open tactic" size="small">
                <ChevronRightIcon />
              </IconButton>
              <Button
                size="small"
                color="error"
                onClick={() => confirm(`Delete "${t.name}"?`) && run(async () => (await api.del(`/tactics/${t.id}`), reload()))}
              >
                Delete
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}
