import {
  Button,
  Link as MuiLink,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { FORMATION_LABEL, FORMATIONS } from '../constants';
import { ErrorAlert, useAction, useLoad } from '../hooks';
import { Formation, Tactic } from '../types';

export function TacticsPage() {
  const navigate = useNavigate();
  const { data: tactics, error: loadError, reload } = useLoad(() => api.get<Tactic[]>('/tactics'), []);
  const { error, run } = useAction();
  const [form, setForm] = useState({ name: '', formation: 'FIVE_ONE' as Formation, opponentFormation: 'FIVE_ONE' as Formation });

  const create = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      const tactic = await api.post<Tactic>('/tactics', form);
      navigate(`/tactics/${tactic.id}`);
    });
  };

  const formationField = (label: string, field: 'formation' | 'opponentFormation') => (
    <TextField size="small" select label={label} sx={{ width: 150 }} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value as Formation })}>
      {FORMATIONS.map((f) => <MenuItem key={f} value={f}>{FORMATION_LABEL[f]}</MenuItem>)}
    </TextField>
  );

  return (
    <>
      <Typography variant="h4" gutterBottom>Tactics</Typography>
      <Typography color="text.secondary">Tactics belong to your account and work with any compatible team.</Typography>
      <ErrorAlert error={loadError || error} />
      <form onSubmit={create}>
        <Stack direction="row" spacing={2} sx={{ my: 2 }}>
          <TextField size="small" label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {formationField('Own formation', 'formation')}
          {formationField('Opponent formation', 'opponentFormation')}
          <Button type="submit" variant="contained">Create tactic</Button>
        </Stack>
      </form>
      <Paper>
        <Table size="small">
          <TableHead>
            <TableRow><TableCell>Name</TableCell><TableCell>Formation</TableCell><TableCell>Vs.</TableCell><TableCell>Steps</TableCell><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {tactics?.map((t) => (
              <TableRow key={t.id}>
                <TableCell><MuiLink component={Link} to={`/tactics/${t.id}`}>{t.name}</MuiLink></TableCell>
                <TableCell>{FORMATION_LABEL[t.formation]}</TableCell>
                <TableCell>{FORMATION_LABEL[t.opponentFormation]}</TableCell>
                <TableCell>{t._count?.steps ?? 0}</TableCell>
                <TableCell align="right">
                  <Button size="small" color="error" onClick={() => confirm(`Delete "${t.name}"?`) && run(async () => (await api.del(`/tactics/${t.id}`), reload()))}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </>
  );
}
