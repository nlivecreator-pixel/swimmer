'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';

export default function ServerSidebar() {
  const {
    servers, activeServerId, setActiveServer, me,
    setShowCreateServer, setShowServerSettings, logout,
  } = useStore();

  const [ctxMenu, setCtxMenu] = useState<{ serverId: string | 'user'; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const hide = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', hide);
    return () => document.removeEventListener('mousedown', hide);
  }, [ctxMenu]);

  function handleServerRightClick(e: React.MouseEvent, serverId: string) {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ serverId, x: e.clientX, y: e.clientY });
  }

  function handleUserRightClick(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ serverId: 'user', x: e.clientX, y: e.clientY });
  }

  const srv = ctxMenu?.serverId && ctxMenu.serverId !== 'user'
    ? servers.find(s => s.id === ctxMenu.serverId) : null;

  const isOwner = srv ? srv.owner_id === me?.id : false;
  const canManage = srv ? (isOwner || canManageSrv(srv, me?.id || '')) : false;

  return (
    <div className="sidebar-servers">
      {/* DM / Home */}
      <SrvBtn active={!activeServerId} onClick={() => setActiveServer('')} tooltip="Личные сообщения">
        <span className="ms" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>chat</span>
      </SrvBtn>

      <div style={{ width: 32, height: 2, background: 'var(--divider)', borderRadius: 1, flexShrink: 0 }} />

      {servers.map(s => (
        <SrvBtn
          key={s.id}
          active={activeServerId === s.id}
          onClick={() => setActiveServer(s.id)}
          onContextMenu={(e: React.MouseEvent) => handleServerRightClick(e, s.id)}
          tooltip={s.name}
        >
          <ServerIcon server={s} size={48} />
        </SrvBtn>
      ))}

      {/* Add server */}
      <SrvBtn active={false} onClick={() => setShowCreateServer(true)} tooltip="Создать сервер">
        <span className="ms" style={{ fontSize: 26 }}>add</span>
      </SrvBtn>

      <div style={{ flex: 1 }} />

      {/* Context menu */}
      {ctxMenu && (
        <div ref={menuRef} style={{
          position: 'fixed', left: ctxMenu.x, top: ctxMenu.y,
          background: 'var(--bg-1)', border: '1px solid var(--glass-border)',
          borderRadius: 10, boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          zIndex: 9999, minWidth: 180, overflow: 'hidden',
          backdropFilter: 'blur(20px)',
        }}>
          {ctxMenu.serverId !== 'user' && (
            <>
              {srv && (
                <div style={{ padding: '10px 14px 6px', borderBottom: '1px solid var(--divider)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ServerIcon server={srv} size={22} borderRadius={6} />
                    {srv.name}
                  </div>
                  {isOwner && <div style={{ fontSize: 10, color: 'var(--accent-2)', marginTop: 2, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <span className="ms filled" style={{ fontSize: 10 }}>star</span>Владелец
                  </div>}
                </div>
              )}
              <MenuItem icon="login" label="Открыть сервер" onClick={() => { setActiveServer(ctxMenu.serverId); setCtxMenu(null); }} />
              {canManage && (
                <MenuItem icon="settings" label="Настройки сервера" onClick={() => {
                  setShowServerSettings(ctxMenu.serverId);
                  setCtxMenu(null);
                }} />
              )}
              <MenuItem icon="person_add" label="Пригласить" onClick={() => {
                useStore.getState().setShowInvite(ctxMenu.serverId);
                setCtxMenu(null);
              }} />
              {!isOwner && (
                <>
                  <div style={{ height: 1, background: 'var(--divider)', margin: '4px 0' }} />
                  <MenuItem icon="exit_to_app" label="Покинуть сервер" danger onClick={() => { setCtxMenu(null); }} />
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function canManageSrv(srv: any, uid: string) {
  const roleId = srv.member_roles?.[uid];
  const role   = srv.roles?.find((r: any) => r.id === roleId);
  return role?.permissions?.includes('manage') ?? false;
}

function MenuItem({ icon, label, sub, danger, onClick }: any) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 14px', cursor: 'pointer',
        background: hover ? (danger ? 'rgba(248,113,113,0.15)' : 'var(--hover)') : 'transparent',
        color: danger ? 'var(--red)' : 'var(--text)',
        transition: 'background .1s',
      }}
    >
      <span className="ms ms-sm" style={{ color: danger ? 'var(--red)' : 'var(--text-3)' }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function ServerIcon({ server, size = 48, borderRadius }: { server: any; size?: number; borderRadius?: number }) {
  const br = borderRadius ?? size * 0.32;
  if (server.image_url) {
    return <img src={`http://localhost:8000${server.image_url}`} alt={server.name}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: br, display: 'block' }} />;
  }
  return <span style={{ fontSize: size * 0.46, lineHeight: 1 }}>{server.icon || '🌐'}</span>;
}

function SrvBtn({ active, onClick, onContextMenu, tooltip, children }: any) {
  return (
    <div
      className={`server-icon${active ? ' active' : ''}`}
      style={{ background: active ? 'linear-gradient(135deg,#5a5ad8,#9b5de5)' : 'var(--bg-3)' }}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {children}
      <div className="server-icon-tooltip">{tooltip}</div>
    </div>
  );
}