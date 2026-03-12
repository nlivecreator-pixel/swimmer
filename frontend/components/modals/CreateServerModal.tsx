'use client';
import { useState } from 'react';
import { useStore } from '../../lib/store';

/* Server icons: these are server identity/branding content, NOT UI navigation icons.
   They are rendered as the server's visual identity and user-selected — kept as emoji. */
const SERVER_ICONS = ['🌐','🌊','🎮','🎵','🎨','💻','🏆','🚀','🔥','💜','⚡','🌍','🎯','🦋','🍕','🎉'];

export default function CreateServerModal() {
  const { me, setShowCreateServer, addServer, setActiveServer, t } = useStore();
  const [name,    setName]    = useState('');
  const [icon,    setIcon]    = useState('🌐');
  const [loading, setLoading] = useState(false);

  async function create() {
    if (!name.trim() || !me) return;
    setLoading(true);
    try {
      const res = await fetch('/api/servers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, icon, owner_id: me.id }),
      });
      const srv = await res.json();
      addServer(srv);
      setActiveServer(srv.id);
      setShowCreateServer(false);
    } catch {
      alert('Ошибка при создании сервера');
    }
    setLoading(false);
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCreateServer(false)}>
      <div className="modal" style={{ width: 440, padding: 32 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'var(--accent-subtle)', border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="ms ms-xl filled" style={{ color: 'var(--accent-2)' }}>add_circle</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{t('create_server')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Создай своё сообщество</div>
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setShowCreateServer(false)}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>

        {/* Server icon picker — emoji as content/identity */}
        <div className="field-group">
          <label className="field-label">Иконка сервера</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SERVER_ICONS.map(ic => (
              <div
                key={ic}
                onClick={() => setIcon(ic)}
                style={{
                  width: 40, height: 40, borderRadius: 10, fontSize: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                  background: icon === ic ? 'var(--accent)' : 'var(--bg-3)',
                  border: `2px solid ${icon === ic ? 'var(--accent-2)' : 'transparent'}`,
                  transition: 'all .15s',
                }}>
                {ic}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div style={{
          margin: '16px 0', padding: '14px', borderRadius: 12,
          background: 'var(--bg-3)', border: '1px solid var(--divider)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', fontSize: 22,
            background: 'linear-gradient(135deg,#5a5ad8,#9b5de5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{icon}</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{name || 'Название сервера'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>1 участник</div>
          </div>
        </div>

        <div className="field-group">
          <label className="field-label">{t('server_name')}</label>
          <input className="field" value={name} onChange={e => setName(e.target.value)}
            placeholder="Мой сервер" onKeyDown={e => e.key === 'Enter' && create()} autoFocus />
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => setShowCreateServer(false)}>
            <span className="ms ms-sm">close</span>
            {t('cancel')}
          </button>
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
            onClick={create} disabled={!name.trim() || loading}>
            {loading
              ? <span className="ms ms-sm" style={{ animation: 'spin .8s linear infinite' }}>progress_activity</span>
              : <span className="ms ms-sm">check</span>}
            {loading ? 'Создание...' : t('create_server')}
          </button>
        </div>
      </div>
    </div>
  );
}
