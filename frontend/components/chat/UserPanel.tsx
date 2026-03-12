'use client';
import { useState } from 'react';
import { useStore } from '../../lib/store';
import UserProfileModal from '../modals/UserProfileModal';

export default function UserPanel() {
  const { showUserPanel, users, me, servers, activeServerId, setDmMessages, toggleUserPanel, setActiveDm, setActiveServer } = useStore();
  const [profileUid,  setProfileUid]  = useState<string | null>(null);
  const [profileRect, setProfileRect] = useState<DOMRect | null>(null);

  if (!showUserPanel) return null;

  const srv          = servers.find(s => s.id === activeServerId);
  const displayUsers = srv
    ? users.filter(u => srv.members.includes(u.id))
    : users.filter(u => u.id !== me?.id);

  const online  = displayUsers.filter(u => u.online  && u.id !== me?.id);
  const offline = displayUsers.filter(u => !u.online && u.id !== me?.id);

  async function openDm(uid: string) {
    if (!me || uid === me.id) return;
    toggleUserPanel();
    setActiveDm(uid);
    setActiveServer('');
    const msgs = await fetch(`/api/dm/${me.id}/${uid}`).then(r => r.json());
    setDmMessages([me.id, uid].sort().join('__'), msgs);
  }

  function handleProfileClick(uid: string, e: React.MouseEvent) {
    e.stopPropagation();
    setProfileUid(uid);
    setProfileRect((e.currentTarget as HTMLElement).getBoundingClientRect());
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
        <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Участники</span>
        <span style={{
          background: 'var(--active)', color: 'var(--accent-2)',
          borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 700,
        }}>{displayUsers.length}</span>
        <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={toggleUserPanel}>
          <span className="ms" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
        {/* Me */}
        {me && (
          <div style={{ padding: '4px 8px', marginBottom: 6 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 8, background: 'var(--accent-subtle)', border: '1px solid var(--glass-border)',
                cursor: 'pointer',
              }}
              onClick={e => handleProfileClick(me.id, e)}
            >
              <UserAv user={me} size={28} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {me.name} <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>(вы)</span>
                </div>
                {me.bio && <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.bio}</div>}
              </div>
            </div>
          </div>
        )}

        {/* Online section */}
        {online.length > 0 && (
          <>
            <SectionHead label="Онлайн" count={online.length} dot="var(--green)" />
            {online.map(u => {
              const role = srv?.roles.find(r => r.id === srv.member_roles?.[u.id]);
              return (
                <UserRow key={u.id} u={u} role={role}
                  onClick={() => openDm(u.id)}
                  onAvatarClick={e => handleProfileClick(u.id, e)}
                />
              );
            })}
          </>
        )}

        {/* Offline section */}
        {offline.length > 0 && (
          <>
            <SectionHead label="Не в сети" count={offline.length} dot="var(--text-3)" />
            {offline.map(u => (
              <UserRow key={u.id} u={u} onClick={() => openDm(u.id)}
                onAvatarClick={e => handleProfileClick(u.id, e)} dim />
            ))}
          </>
        )}
      </div>

      {/* Profile popup */}
      {profileUid && (
        <UserProfileModal
          userId={profileUid}
          serverId={activeServerId || null}
          anchorRect={profileRect}
          onClose={() => { setProfileUid(null); setProfileRect(null); }}
          onDm={() => { setProfileUid(null); openDm(profileUid); }}
        />
      )}
    </div>
  );
}

function SectionHead({ label, count, dot }: any) {
  return (
    <div style={{
      padding: '10px 14px 4px', fontSize: 11, fontWeight: 700,
      color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 5,
    }}>
      <span className="ms ms-sm filled" style={{ color: dot, fontSize: 10 }}>circle</span>
      {label} — {count}
    </div>
  );
}

function UserAv({ user, size }: { user: any; size: number }) {
  if (user?.avatar_url) {
    return (
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
        <img src={`http://localhost:8000${user.avatar_url}`} alt={user.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {user.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--sidebar-bg)' }} />}
      </div>
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: user.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.44, fontWeight: 700, color: '#fff', position: 'relative',
    }}>
      {user.letter}
      {user.online && <div style={{ position: 'absolute', bottom: 0, right: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--green)', border: '2px solid var(--sidebar-bg)' }} />}
    </div>
  );
}

function UserRow({ u, role, onClick, onAvatarClick, dim }: any) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 9, padding: '5px 8px',
      borderRadius: 8, margin: '0 4px 1px', cursor: 'pointer',
      opacity: dim ? 0.5 : 1, transition: 'background .12s, opacity .12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; if (dim) e.currentTarget.style.opacity = '0.75'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (dim) e.currentTarget.style.opacity = dim ? '0.5' : '1'; }}
      onClick={onClick}
    >
      <div onClick={onAvatarClick} style={{ flexShrink: 0 }}>
        <UserAv user={u} size={28} />
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: role?.color || 'var(--text)' }}>
          {u.name}
        </div>
        {role && (
          <div style={{ fontSize: 10, color: role.color, fontWeight: 600, opacity: .8 }}>{role.name}</div>
        )}
      </div>
    </div>
  );
}
