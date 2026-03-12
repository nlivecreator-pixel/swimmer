'use client';
import { useStore } from '../../lib/store';

export default function UserPanel() {
  const { showUserPanel, users, me, servers, activeServerId, t, setDmMessages, toggleUserPanel } = useStore();
  if (!showUserPanel) return null;

  const srv          = servers.find(s => s.id === activeServerId);
  const displayUsers = srv
    ? users.filter(u => srv.members.includes(u.id))
    : users.filter(u => u.id !== me?.id);

  const online  = displayUsers.filter(u => u.online  && u.id !== me?.id);
  const offline = displayUsers.filter(u => !u.online && u.id !== me?.id);

  async function openDm(uid: string) {
    if (!me) return;
    toggleUserPanel();
    useStore.getState().setActiveDm(uid);
    useStore.getState().setActiveServer('');
    const msgs = await fetch(`/api/dm/${me.id}/${uid}`).then(r => r.json());
    setDmMessages([me.id, uid].sort().join('__'), msgs);
  }

  return (
    <div style={{
      width: 232, background: 'var(--sidebar-bg)', flexShrink: 0,
      borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span className="ms ms-sm" style={{ color: 'var(--text-3)' }}>group</span>
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>{t('members')}</span>
        <span style={{
          background: 'var(--active)', color: 'var(--accent-2)',
          borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700,
        }}>
          {displayUsers.length}
        </span>
        <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={toggleUserPanel}>
          <span className="ms" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
        {/* Me */}
        {me && (
          <div style={{ padding: '4px 8px', marginBottom: 4 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
              borderRadius: 8, background: 'var(--accent-subtle)', border: '1px solid var(--glass-border)',
            }}>
              <div className="avatar av-sm" style={{ background: me.color, position: 'relative' }}>
                {me.letter}
                <div className="online-dot" />
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {me.name}
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400, marginLeft: 4 }}>(вы)</span>
                </div>
                {me.bio && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {me.bio}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Online */}
        {online.length > 0 && (
          <>
            <div style={{
              padding: '4px 14px 6px', fontSize: 11, fontWeight: 700,
              color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span className="ms ms-sm filled" style={{ color: 'var(--green)', fontSize: 10 }}>circle</span>
              {t('online')} — {online.length}
            </div>
            {online.map(u => {
              const role = srv?.roles.find(r => r.id === srv.member_roles[u.id]);
              return (
                <UserRow key={u.id} u={u} role={role} onClick={() => openDm(u.id)} />
              );
            })}
          </>
        )}

        {/* Offline */}
        {offline.length > 0 && (
          <>
            <div style={{
              padding: '12px 14px 6px', fontSize: 11, fontWeight: 700,
              color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span className="ms ms-sm" style={{ color: 'var(--text-4)', fontSize: 10 }}>circle</span>
              {t('offline')} — {offline.length}
            </div>
            {offline.map(u => (
              <UserRow key={u.id} u={u} onClick={() => openDm(u.id)} dim />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function UserRow({ u, role, onClick, dim }: any) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '5px 8px',
        borderRadius: 8, margin: '0 4px 2px', cursor: 'pointer',
        opacity: dim ? 0.5 : 1, transition: 'background .12s, opacity .12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; if (dim) e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (dim) e.currentTarget.style.opacity = '0.5'; }}
      onClick={onClick}
    >
      {u.avatar_url ? (
        <img src={`http://localhost:8000${u.avatar_url}`} alt={u.name}
          style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div className="avatar av-sm" style={{ background: u.color, position: 'relative' }}>
          {u.letter}
          {u.online && <div className="online-dot" />}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: role?.color || 'var(--text)' }}>
          {u.name}
        </div>
        {role && (
          <span className="role-pill" style={{ color: role.color, fontSize: 10 }}>{role.name}</span>
        )}
      </div>
    </div>
  );
}
