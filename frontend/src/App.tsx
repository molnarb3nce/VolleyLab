import { FormEvent, useEffect, useMemo, useState } from 'react';
import { makeCall, Player, ROLES, Team } from './api';

interface Session {
  token: string;
  user: { id: number; email: string };
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem('session');
    return saved ? JSON.parse(saved) : null;
  });
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState('');

  const call = useMemo(
    () => makeCall(session?.token ?? null, (line) => setLog((l) => [line, ...l].slice(0, 30))),
    [session],
  );

  /** Runs an action and shows its error (if any) instead of crashing. */
  const run = async (action: () => Promise<unknown>) => {
    setError('');
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const setAndStoreSession = (s: Session | null) => {
    if (s) localStorage.setItem('session', JSON.stringify(s));
    else localStorage.removeItem('session');
    setSession(s);
  };

  return (
    <div style={{ fontFamily: 'sans-serif', maxWidth: 900, margin: '1rem auto', padding: '0 1rem' }}>
      <h1>VolleyLab test UI</h1>
      {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
      {session ? (
        <>
          <p>
            Logged in as <b>{session.user.email}</b> (id {session.user.id}){' '}
            <button onClick={() => setAndStoreSession(null)}>Log out</button>
          </p>
          <Teams call={call} userId={session.user.id} run={run} />
        </>
      ) : (
        <AuthForm
          run={run}
          onSession={(s) => setAndStoreSession(s)}
          call={call}
        />
      )}
      <h3>Request log</h3>
      <pre style={{ background: '#eee', padding: 8, fontSize: 12, whiteSpace: 'pre-wrap' }}>
        {log.join('\n') || '(empty)'}
      </pre>
    </div>
  );
}

type Run = (action: () => Promise<unknown>) => Promise<void>;
type CallFn = ReturnType<typeof makeCall>;

function AuthForm(props: { call: CallFn; run: Run; onSession: (s: Session) => void }) {
  const [email, setEmail] = useState('coach@example.com');
  const [password, setPassword] = useState('password123');

  const submit = (mode: 'login' | 'register') => (e: FormEvent) => {
    e.preventDefault();
    props.run(async () => {
      const r = await props.call<{ accessToken: string; user: Session['user'] }>('POST', `/auth/${mode}`, {
        email,
        password,
      });
      props.onSession({ token: r.accessToken, user: r.user });
    });
  };

  return (
    <form onSubmit={submit('login')}>
      <h2>Login / Register</h2>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />{' '}
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="password (min 8)"
      />{' '}
      <button type="submit">Login</button>{' '}
      <button type="button" onClick={submit('register')}>
        Register
      </button>
    </form>
  );
}

function Teams(props: { call: CallFn; userId: number; run: Run }) {
  const { call, run } = props;
  const [teams, setTeams] = useState<Team[]>([]);
  const [mine, setMine] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Team | null>(null);

  const loadTeams = () => run(async () => setTeams(await call<Team[]>('GET', `/teams${mine ? '?mine=true' : ''}`)));
  const open = (id: number) => run(async () => setSelected(await call<Team>('GET', `/teams/${id}`)));

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, call]);

  const createTeam = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await call('POST', '/teams', { name });
      setName('');
      await loadTeams();
    });
  };

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <h2>Teams</h2>
        <label>
          <input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} /> only mine
        </label>
        <ul>
          {teams.map((t) => (
            <li key={t.id}>
              <a href="#" onClick={(e) => (e.preventDefault(), open(t.id))}>
                {t.name}
              </a>{' '}
              ({t._count?.players ?? 0} players){t.ownerId === props.userId && ' - yours'}
            </li>
          ))}
        </ul>
        <form onSubmit={createTeam}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="new team name" />{' '}
          <button type="submit">Create team</button>
        </form>
      </div>
      {selected && (
        <TeamDetail
          key={selected.id}
          team={selected}
          isOwner={selected.ownerId === props.userId}
          call={call}
          run={run}
          reload={() => open(selected.id)}
          onChanged={loadTeams}
          onDeleted={() => (setSelected(null), loadTeams())}
        />
      )}
    </div>
  );
}

function TeamDetail(props: {
  team: Team;
  isOwner: boolean;
  call: CallFn;
  run: Run;
  reload: () => Promise<void>;
  onChanged: () => Promise<void>;
  onDeleted: () => void;
}) {
  const { team, call, run, reload } = props;
  const [teamName, setTeamName] = useState(team.name);
  const [player, setPlayer] = useState({ name: '', jerseyNumber: '', role: ROLES[0] as string });

  const afterChange = async () => {
    await reload();
    await props.onChanged();
  };

  const addPlayer = (e: FormEvent) => {
    e.preventDefault();
    run(async () => {
      await call('POST', `/teams/${team.id}/players`, {
        name: player.name,
        jerseyNumber: Number(player.jerseyNumber),
        role: player.role,
      });
      setPlayer({ ...player, name: '', jerseyNumber: '' });
      await afterChange();
    });
  };

  const renamePlayer = (p: Player) => {
    const newName = prompt('New name', p.name);
    if (newName) run(async () => (await call('PATCH', `/players/${p.id}`, { name: newName }), afterChange()));
  };

  return (
    <div style={{ flex: 1 }}>
      <h2>{team.name}</h2>
      {props.isOwner ? (
        <p>
          <input value={teamName} onChange={(e) => setTeamName(e.target.value)} />{' '}
          <button onClick={() => run(async () => (await call('PATCH', `/teams/${team.id}`, { name: teamName }), afterChange()))}>
            Rename
          </button>{' '}
          <button onClick={() => run(async () => (await call('DELETE', `/teams/${team.id}`), props.onDeleted()))}>
            Delete team
          </button>
        </p>
      ) : (
        <p>
          <i>Read-only: you are not the owner.</i>
        </p>
      )}

      <table cellPadding={4}>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Role</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {team.players?.map((p) => (
            <tr key={p.id}>
              <td>{p.jerseyNumber}</td>
              <td>{p.name}</td>
              <td>{p.role}</td>
              <td>
                {props.isOwner && (
                  <>
                    <button onClick={() => renamePlayer(p)}>Rename</button>{' '}
                    <button onClick={() => run(async () => (await call('DELETE', `/players/${p.id}`), afterChange()))}>
                      Remove
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {props.isOwner && (
        <form onSubmit={addPlayer} style={{ marginTop: 12 }}>
          <input value={player.name} onChange={(e) => setPlayer({ ...player, name: e.target.value })} placeholder="name" />{' '}
          <input
            type="number"
            style={{ width: 60 }}
            value={player.jerseyNumber}
            onChange={(e) => setPlayer({ ...player, jerseyNumber: e.target.value })}
            placeholder="#"
          />{' '}
          <select value={player.role} onChange={(e) => setPlayer({ ...player, role: e.target.value })}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>{' '}
          <button type="submit">Add player</button>
        </form>
      )}
    </div>
  );
}

