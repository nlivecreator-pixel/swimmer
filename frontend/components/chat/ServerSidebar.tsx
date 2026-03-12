'use client';
import { useStore } from '../../lib/store';

export default function ServerSidebar() {
  const { servers, activeServerId, setActiveServer, me, setShowSettings, setShowCreateServer } = useStore();

  return (
    <div className="sidebar-servers">
      {/* DM / Home */}
      <SrvBtn
        active={!activeServerId}
        onClick={() => setActiveServer('')}
        tooltip="Личные сообщения"
        gradient="linear-gradient(135deg,#5a5ad8,#7c7cf5)"
      >
        <span className="ms" style={{ fontSize: 26, fontVariationSettings: "'FILL' 1" }}>chat</span>
      </SrvBtn>

      <div style={{ width: 32, height: 2, background: 'var(--divider)', borderRadius: 1, flexShrink: 0 }} />

      {servers.map(s => (
        <SrvBtn
          key={s.id}
          active={activeServerId === s.id}
          onClick={() => setActiveServer(s.id)}
          tooltip={s.name}
          gradient="linear-gradient(135deg,#5a5ad8,#9b5de5)"
        >
          <ServerIcon server={s} size={48} />
        </SrvBtn>
      ))}

      {/* Add server */}
      <SrvBtn active={false} onClick={() => setShowCreateServer(true)} tooltip="Создать сервер">
        <span className="ms" style={{ fontSize: 26 }}>add</span>
      </SrvBtn>

      <div style={{ flex: 1 }} />

      {me && (
        <div
          className="server-icon"
          style={{ position: 'relative', cursor: 'pointer', padding: 0, overflow: 'hidden' }}
          onClick={() => setShowSettings(true)}
          title={me.name}
        >
          {me.avatar_url ? (
            <img src={`http://localhost:8000${me.avatar_url}`} alt={me.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', borderRadius: 'inherit',
              background: me.color, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff',
            }}>{me.letter}</div>
          )}
          <div className="online-dot" style={{ border: '2px solid var(--sidebar-servers-bg, var(--bg-deep))' }} />
          <div className="server-icon-tooltip">{me.name}</div>
        </div>
      )}
    </div>
  );
}

export function ServerIcon({ server, size = 48, borderRadius }: { server: any; size?: number; borderRadius?: number }) {
  const br = borderRadius ?? (size * 0.32);
  if (server.image_url) {
    return (
      <img
        src={`http://localhost:8000${server.image_url}`}
        alt={server.name}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: br, display: 'block' }}
      />
    );
  }
  // Fallback: emoji icon
  return (
    <span style={{ fontSize: size * 0.46, lineHeight: 1 }}>{server.icon || '🌐'}</span>
  );
}

function SrvBtn({ active, onClick, tooltip, gradient, children }: any) {
  return (
    <div style={{ position: 'relative' }}>
      <div
        className={`server-icon${active ? ' active' : ''}`}
        style={{ background: active ? gradient : 'var(--bg-3)' }}
        onClick={onClick}
      >
        {children}
        <div className="server-icon-tooltip">{tooltip}</div>
      </div>
    </div>
  );
}
