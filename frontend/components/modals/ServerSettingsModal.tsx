'use client';
import { useState, useRef } from 'react';
import { useStore } from '../../lib/store';
import { ServerIcon } from '../chat/ServerSidebar';

type Tab = 'overview' | 'channels' | 'roles' | 'members' | 'stickers';

const SERVER_ICON_OPTIONS = ['🌐','🌊','🎮','🎵','🎨','💻','🏆','🚀','🔥','💜','⚡','🌍'];

export default function ServerSettingsModal({ sid }: { sid: string }) {
  const { servers, setShowServerSettings, t, updateServer, me } = useStore();
  const srv = servers.find(s => s.id === sid);

  // Helper: fetch with user auth header
  function authFetch(url: string, opts: RequestInit = {}) {
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), 'X-User-Id': me?.id || '' },
    });
  }

  const [tab,             setTab]             = useState<Tab>('overview');
  const [srvName,         setSrvName]         = useState(srv?.name        || '');
  const [srvDesc,         setSrvDesc]         = useState(srv?.description || '');
  const [srvIcon,         setSrvIcon]         = useState(srv?.icon        || '🌐');
  const [newChName,       setNewChName]       = useState('');
  const [newChType,       setNewChType]       = useState('text');
  const [newRoleName,     setNewRoleName]     = useState('');
  const [newRoleColor,    setNewRoleColor]    = useState('#5ae8b8');
  const [newStickerEmoji, setNewStickerEmoji] = useState('');
  const [newStickerName,  setNewStickerName]  = useState('');
  const [toast,           setToast]           = useState('');
  const [imgUploading,    setImgUploading]    = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  if (!srv) return null;

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2000); }

  async function saveOverview() {
    const res = await authFetch(`/api/servers/${sid}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: srvName, description: srvDesc, icon: srvIcon }),
    });
    if (res.ok) { updateServer(await res.json()); showToast('Сохранено!'); }
    else showToast('Нет прав для изменения сервера');
  }

  async function uploadServerImage(file: File) {
    setImgUploading(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await authFetch(`/api/servers/${sid}/image`, { method: 'POST', body: fd });
      if (res.ok) { updateServer(await res.json()); showToast('Фото обновлено!'); }
      else showToast('Нет прав');
    } catch { showToast('Ошибка загрузки'); }
    setImgUploading(false);
  }

  async function addChannel() {
    if (!newChName.trim()) return;
    await authFetch(`/api/servers/${sid}/channels`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChName, type: newChType }),
    });
    setNewChName('');
    showToast('Канал добавлен!');
  }

  async function deleteChannel(cid: string) {
    await authFetch(`/api/servers/${sid}/channels/${cid}`, { method: 'DELETE' });
    showToast('Удалено');
  }

  async function addRole() {
    if (!newRoleName.trim()) return;
    await authFetch(`/api/servers/${sid}/roles`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRoleName, color: newRoleColor }),
    });
    setNewRoleName('');
    showToast('Роль добавлена!');
  }

  async function addSticker() {
    if (!newStickerEmoji.trim() || !newStickerName.trim()) return;
    await authFetch(`/api/servers/${sid}/stickers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emoji: newStickerEmoji, name: newStickerName }),
    });
    setNewStickerEmoji(''); setNewStickerName('');
    showToast('Стикер добавлен!');
  }

  async function delSticker(skid: string) {
    await authFetch(`/api/servers/${sid}/stickers/${skid}`, { method: 'DELETE' });
    showToast('Удалено');
  }

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'overview',  icon: 'info',            label: t('server_info') },
    { id: 'channels',  icon: 'tag',             label: t('channels_settings') },
    { id: 'roles',     icon: 'shield',          label: t('roles') },
    { id: 'members',   icon: 'group',           label: t('server_members') },
    { id: 'stickers',  icon: 'emoji_emotions',  label: t('server_stickers') },
  ];

  const chTypeIcon = (type: string) =>
    type === 'text' ? 'tag' : type === 'voice' ? 'volume_up' : 'campaign';

  return (
    <div className="settings-overlay">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 400,
          padding: '12px 18px', background: 'var(--modal-bg)',
          border: '1px solid var(--accent)', borderRadius: 10,
          fontSize: 14, fontWeight: 600, color: 'var(--green)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="ms ms-sm filled">check_circle</span>
          {toast}
        </div>
      )}

      <button className="settings-close" onClick={() => setShowServerSettings(null)}>
        <span className="ms ms-lg">close</span>
      </button>

      {/* Left nav */}
      <div className="settings-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 10px 16px', flexShrink: 0 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{srv.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{srv.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Настройки сервера</div>
          </div>
        </div>
        {navItems.map(n => (
          <div key={n.id}
            className={`settings-nav-item${tab === n.id ? ' active' : ''}`}
            onClick={() => setTab(n.id)}>
            <span className="ms ms-sm">{n.icon}</span>
            {n.label}
          </div>
        ))}
      </div>

      {/* Right content */}
      <div className="settings-right">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            <div className="settings-title">{t('server_info')}</div>

            {/* Server image upload */}
            <div className="settings-section">
              <div className="settings-label">{t('server_image')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 18, overflow: 'hidden',
                  background: 'var(--bg-3)', border: '2px solid var(--divider)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 32, flexShrink: 0,
                }}>
                  {srv.image_url
                    ? <img src={`http://localhost:8000${srv.image_url}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 36 }}>{srv.icon}</span>
                  }
                </div>
                <div>
                  <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && uploadServerImage(e.target.files[0])} />
                  <button className="btn btn-ghost" onClick={() => imgRef.current?.click()} disabled={imgUploading}>
                    <span className="ms ms-sm">{imgUploading ? 'hourglass_empty' : 'upload'}</span>
                    {imgUploading ? 'Загрузка...' : t('upload_server_image')}
                  </button>
                  {srv.image_url && (
                    <button className="btn btn-danger" style={{ marginLeft: 8 }} onClick={async () => {
                      const res = await authFetch(`/api/servers/${sid}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ image_url: null }),
                      });
                      if (res.ok) updateServer(await res.json());
                    }}>
                      <span className="ms ms-sm">delete</span>Удалить фото
                    </button>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>
                    Рекомендуемый размер: 256×256px
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-label">Эмодзи иконка (запасная)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {SERVER_ICON_OPTIONS.map(ic => (
                  <div key={ic}
                    onClick={() => setSrvIcon(ic)}
                    style={{
                      width: 46, height: 46, borderRadius: 12, fontSize: 22,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer',
                      background: srvIcon === ic ? 'var(--accent)' : 'var(--bg-3)',
                      border: `2px solid ${srvIcon === ic ? 'var(--accent-2)' : 'var(--divider)'}`,
                      transition: 'all .15s',
                    }}>{ic}</div>
                ))}
              </div>
              <div className="field-group">
                <label className="field-label">{t('server_name')}</label>
                <input className="field" value={srvName} onChange={e => setSrvName(e.target.value)} />
              </div>
              <div className="field-group">
                <label className="field-label">{t('server_desc')}</label>
                <textarea className="field" value={srvDesc} onChange={e => setSrvDesc(e.target.value)}
                  rows={3} style={{ resize: 'vertical' }} />
              </div>
              <button className="btn btn-primary" onClick={saveOverview}>
                <span className="ms ms-sm">save</span>{t('save')}
              </button>
            </div>
          </>
        )}

        {/* CHANNELS */}
        {tab === 'channels' && (
          <>
            <div className="settings-title">{t('channels_settings')}</div>
            <div className="settings-section">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="field" value={newChName} onChange={e => setNewChName(e.target.value)}
                  placeholder={t('channel_name')} style={{ flex: 1 }} />
                <select className="field" value={newChType} onChange={e => setNewChType(e.target.value)}
                  style={{ width: 150 }}>
                  <option value="text">Текстовый</option>
                  <option value="voice">Голосовой</option>
                  <option value="news">Новостной</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={addChannel}>
                  <span className="ms ms-sm">add</span>
                </button>
              </div>
            </div>
            {srv.channels.map(ch => (
              <div key={ch.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', marginBottom: 6,
              }}>
                <span className="ms" style={{ color: 'var(--text-3)' }}>{chTypeIcon(ch.type)}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{ch.name}</span>
                <span style={{
                  fontSize: 11, color: 'var(--text-3)', background: 'var(--hover)',
                  padding: '2px 8px', borderRadius: 20,
                }}>{ch.type}</span>
                <button className="icon-btn" style={{ color: 'var(--red)' }} onClick={() => deleteChannel(ch.id)}>
                  <span className="ms ms-sm">delete</span>
                </button>
              </div>
            ))}
          </>
        )}

        {/* ROLES */}
        {tab === 'roles' && (
          <>
            <div className="settings-title">{t('roles')}</div>
            <div className="settings-section">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input className="field" value={newRoleName} onChange={e => setNewRoleName(e.target.value)}
                  placeholder={t('role_name')} style={{ flex: 1 }} />
                <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)}
                  style={{ width: 44, height: 42, border: '1px solid var(--divider)', borderRadius: 8, cursor: 'pointer', padding: 3, background: 'transparent' }} />
                <button className="btn btn-primary btn-sm" onClick={addRole}>
                  <span className="ms ms-sm">add</span>
                </button>
              </div>
            </div>
            {srv.roles.map(r => (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 8, background: 'var(--bg-3)', marginBottom: 6,
              }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: r.color }}>{r.name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{r.permissions.join(', ')}</span>
              </div>
            ))}
          </>
        )}

        {/* MEMBERS */}
        {tab === 'members' && (
          <>
            <div className="settings-title">{t('server_members')}</div>
            <div style={{ color: 'var(--text-3)', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="ms ms-sm">group</span>
              {srv.members.length} участников
            </div>
            {srv.members.map(uid => {
              const u      = useStore.getState().users.find(x => x.id === uid);
              if (!u) return null;
              const roleId = srv.member_roles[uid];
              const role   = srv.roles.find(r => r.id === roleId);
              const isOwner = uid === srv.owner_id;
              return (
                <div key={uid} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 8, background: 'var(--bg-3)', marginBottom: 6,
                }}>
                  <div className="avatar av-md" style={{ background: u.color, position: 'relative' }}>
                    {u.letter}
                    {u.online && <div className="online-dot" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                      {u.name}
                      {isOwner && (
                        <span className="badge badge-accent" style={{ display: 'inline-flex', gap: 3 }}>
                          <span className="ms ms-sm filled">star</span>Владелец
                        </span>
                      )}
                    </div>
                    {role && (
                      <span className="role-pill" style={{ color: role.color, borderColor: role.color, fontSize: 11 }}>
                        {role.name}
                      </span>
                    )}
                  </div>
                  <select className="field" style={{ width: 140, padding: '4px 8px', fontSize: 12 }}
                    value={roleId || ''}
                    onChange={async e => {
                      await authFetch(`/api/servers/${sid}/members/${uid}/role`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ role_id: e.target.value || null }),
                      });
                    }}>
                    <option value="">Без роли</option>
                    {srv.roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              );
            })}
          </>
        )}

        {/* STICKERS */}
        {tab === 'stickers' && (
          <>
            <div className="settings-title">{t('server_stickers')}</div>
            <div className="settings-section">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {/* Sticker emoji is content — user enters it */}
                <input className="field" value={newStickerEmoji} onChange={e => setNewStickerEmoji(e.target.value)}
                  placeholder="Эмодзи (напр. 🔥)" style={{ width: 140 }} />
                <input className="field" value={newStickerName} onChange={e => setNewStickerName(e.target.value)}
                  placeholder={t('sticker_name')} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={addSticker}>
                  <span className="ms ms-sm">add</span>
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {srv.stickers.map(sk => (
                <div key={sk.id} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  padding: '12px 16px', borderRadius: 12,
                  background: 'var(--bg-3)', border: '1px solid var(--divider)',
                  position: 'relative', minWidth: 80,
                }}>
                  <span style={{ fontSize: 40 }}>{sk.emoji}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>{sk.name}</span>
                  <button
                    onClick={() => delSticker(sk.id)}
                    style={{
                      position: 'absolute', top: 4, right: 4,
                      width: 22, height: 22, borderRadius: 6,
                      border: 'none', background: 'var(--hover)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                    <span className="ms" style={{ fontSize: 14, color: 'var(--red)' }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
