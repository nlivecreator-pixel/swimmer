'use client';
import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../lib/store';

type Tab = 'profile' | 'appearance' | 'language' | 'voice';

const AVATAR_COLORS = [
  '#5a5ad8','#e85a9a','#5ae8b8','#e8a85a','#a85ae8',
  '#5ae8e8','#e85a5a','#5ae85a','#e8e85a','#5ab8e8','#e85ae8','#ff6b6b',
];

export default function SettingsModal() {
  const { me, setShowSettings, theme, setTheme, lang, setLang, t, updateMe, logout } = useStore();

  const [tab,     setTab]     = useState<Tab>('profile');
  const [name,    setName]    = useState(me?.name  || '');
  const [bio,     setBio]     = useState(me?.bio   || '');
  const [color,   setColor]   = useState(me?.color || '#5a5ad8');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState('');
  const [uploading, setUploading] = useState(false);

  // Single file input ref — defined once outside all tabs
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync state when me changes (e.g. after realtime update)
  useEffect(() => {
    if (me) {
      setName(me.name || '');
      setBio(me.bio || '');
      setColor(me.color || '#5a5ad8');
    }
  }, [me?.id]);

  // Current avatar display (image or letter)
  const avatarUrl = me?.avatar_url ? `http://localhost:8000${me.avatar_url}` : null;

  async function saveProfile() {
    if (!me || saving) return;
    const trimmedName = name.trim();
    if (!trimmedName) { setError('Имя не может быть пустым'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/users/${me.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, bio: bio.trim(), color }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      updateMe(data);
      localStorage.setItem('swimer_me', JSON.stringify({
        ...JSON.parse(localStorage.getItem('swimer_me') || '{}'), ...data,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e.message || 'Ошибка сохранения');
    }
    setSaving(false);
  }

  async function uploadAvatar(file: File) {
    if (!me || uploading) return;
    setUploading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/users/${me.id}/avatar`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      updateMe(data);
      localStorage.setItem('swimer_me', JSON.stringify({
        ...JSON.parse(localStorage.getItem('swimer_me') || '{}'), ...data,
      }));
    } catch (e: any) {
      setError('Ошибка загрузки: ' + (e.message || 'неизвестная ошибка'));
    }
    setUploading(false);
    // Reset file input so same file can be selected again
    if (fileRef.current) fileRef.current.value = '';
  }

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'profile',    icon: 'person',    label: 'Профиль' },
    { id: 'appearance', icon: 'palette',   label: 'Внешний вид' },
    { id: 'language',   icon: 'language',  label: 'Язык' },
    { id: 'voice',      icon: 'mic',       label: 'Голос и видео' },
  ];

  return (
    <div className="settings-overlay">
      {/* Single hidden file input — outside any conditional block */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }}
      />

      <button className="settings-close" onClick={() => setShowSettings(false)}>
        <span className="ms ms-lg">close</span>
      </button>

      {/* ── Left nav ── */}
      <div className="settings-left">
        {/* Mini profile card at top of nav */}
        <div style={{
          padding: '16px 12px 20px', borderBottom: '1px solid var(--divider)', marginBottom: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        }}>
          {/* Avatar with upload overlay */}
          <div
            style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}
            onClick={() => fileRef.current?.click()}
            title="Сменить аватар"
          >
            <div style={{
              width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
              border: '3px solid var(--accent)', flexShrink: 0,
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={me?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%', height: '100%', background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 700, color: '#fff',
                }}>
                  {me?.letter}
                </div>
              )}
            </div>
            {/* Upload overlay on hover */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: uploading ? 1 : 0, transition: 'opacity .15s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
              onMouseLeave={e => { if (!uploading) (e.currentTarget as HTMLDivElement).style.opacity = '0'; }}
            >
              <span className="ms ms-lg filled" style={{ color: '#fff', fontSize: uploading ? 18 : 22 }}>
                {uploading ? 'hourglass_top' : 'photo_camera'}
              </span>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{me?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>#{me?.id?.slice(0, 6)}</div>
          </div>
        </div>

        <div style={{ padding: '0 8px' }}>
          <div className="settings-nav-section">Настройки</div>
          {navItems.map(n => (
            <div key={n.id}
              className={`settings-nav-item${tab === n.id ? ' active' : ''}`}
              onClick={() => setTab(n.id)}>
              <span className="ms ms-sm">{n.icon}</span>
              {n.label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Logout at very bottom */}
        <div style={{ padding: '8px 8px 16px', borderTop: '1px solid var(--divider)' }}>
          <div
            className="settings-nav-item"
            onClick={() => { setShowSettings(false); setTimeout(logout, 100); }}
            style={{ color: 'var(--red)' }}
          >
            <span className="ms ms-sm" style={{ color: 'var(--red)' }}>logout</span>
            <span style={{ color: 'var(--red)', fontWeight: 700 }}>Выйти из аккаунта</span>
          </div>
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="settings-right">

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <>
            <div className="settings-title">Редактировать профиль</div>

            {/* Live preview card */}
            <div style={{
              borderRadius: 14, overflow: 'hidden',
              border: '1px solid var(--divider)', marginBottom: 28,
            }}>
              <div style={{
                height: 80,
                background: `linear-gradient(135deg, ${color}, ${color}88)`,
              }} />
              <div style={{ background: 'var(--bg-3)', padding: '0 16px 16px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
                  border: '4px solid var(--bg-3)', marginTop: -32, marginBottom: 10,
                  cursor: 'pointer', position: 'relative',
                }} onClick={() => fileRef.current?.click()}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%', background: color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 22, fontWeight: 700, color: '#fff',
                    }}>{me?.letter}</div>
                  )}
                </div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{name || me?.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>#{me?.id?.slice(0, 6)}</div>
                {bio && <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>{bio}</div>}
              </div>
            </div>

            {/* Avatar upload row */}
            <div className="settings-section">
              <div className="settings-label">Аватар</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#fff' }}>{me?.letter}</div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <span className="ms ms-sm">{uploading ? 'hourglass_top' : 'upload'}</span>
                    {uploading ? 'Загрузка...' : 'Загрузить фото'}
                  </button>
                  {avatarUrl && (
                    <button className="btn btn-danger btn-sm" onClick={async () => {
                      if (!me) return;
                      const res = await fetch(`/api/users/${me.id}`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ avatar_url: null }),
                      });
                      const data = await res.json();
                      updateMe(data);
                      localStorage.setItem('swimer_me', JSON.stringify({
                        ...JSON.parse(localStorage.getItem('swimer_me') || '{}'), ...data,
                      }));
                    }}>
                      <span className="ms ms-sm">delete</span>Удалить
                    </button>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>
                JPG, PNG, WebP, GIF · до 8 МБ
              </div>
            </div>

            <div className="settings-divider" />

            {/* Name + Bio fields */}
            <div className="settings-section">
              <div className="field-group">
                <label className="field-label">Имя пользователя</label>
                <input
                  className="field"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Имя"
                  maxLength={32}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {name.length}/32
                </div>
              </div>
              <div className="field-group" style={{ marginTop: 14 }}>
                <label className="field-label">О себе</label>
                <textarea
                  className="field"
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Расскажи о себе..."
                  rows={3}
                  maxLength={190}
                  style={{ resize: 'vertical', lineHeight: 1.5 }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {bio.length}/190
                </div>
              </div>
            </div>

            <div className="settings-divider" />

            {/* Color picker */}
            <div className="settings-section">
              <div className="settings-label">Цвет аватара</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {AVATAR_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 38, height: 38, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: color === c ? '3px solid #fff' : '3px solid transparent',
                      boxShadow: color === c ? `0 0 0 2px ${c}, 0 0 12px ${c}88` : 'none',
                      transform: color === c ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all .15s',
                    }}
                  />
                ))}
                {/* Custom color picker */}
                <label style={{
                  width: 38, height: 38, borderRadius: '50%', cursor: 'pointer',
                  border: '2px dashed var(--divider)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', position: 'relative', overflow: 'hidden',
                }}>
                  <span className="ms" style={{ fontSize: 16, color: 'var(--text-3)' }}>colorize</span>
                  <input type="color" value={color} onChange={e => setColor(e.target.value)}
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }} />
                </label>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                color: 'var(--red)', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center',
              }}>
                <span className="ms ms-sm">error</span>{error}
              </div>
            )}

            {/* Save / Cancel */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" onClick={saveProfile} disabled={saving || !name.trim()}>
                {saving
                  ? <span className="ms ms-sm" style={{ animation: 'spin .7s linear infinite' }}>progress_activity</span>
                  : <span className="ms ms-sm filled">{saved ? 'check_circle' : 'save'}</span>
                }
                {saving ? 'Сохранение...' : saved ? 'Сохранено!' : 'Сохранить'}
              </button>
              <button className="btn btn-ghost" onClick={() => {
                if (me) { setName(me.name); setBio(me.bio || ''); setColor(me.color); }
                setError('');
              }}>
                <span className="ms ms-sm">restart_alt</span>
                Сбросить
              </button>
            </div>
          </>
        )}

        {/* APPEARANCE TAB */}
        {tab === 'appearance' && (
          <>
            <div className="settings-title">Внешний вид</div>
            <div className="settings-section">
              <div className="settings-label">Тема</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
                {(['dark', 'light'] as const).map(th => (
                  <div key={th} onClick={() => setTheme(th)} style={{
                    width: 160, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                    border: `2px solid ${theme === th ? 'var(--accent)' : 'var(--divider)'}`,
                    boxShadow: theme === th ? '0 0 20px var(--accent-glow)' : 'none',
                    transition: 'all .2s',
                  }}>
                    <div style={{
                      height: 96,
                      background: th === 'dark'
                        ? 'linear-gradient(135deg,#1a1a20,#0d0d12)'
                        : 'linear-gradient(135deg,#ffffff,#f0f0f8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="ms" style={{
                        fontSize: 44, color: th === 'dark' ? '#7c7cf5' : '#5a5ad8',
                        fontVariationSettings: "'FILL' 1",
                      }}>{th === 'dark' ? 'dark_mode' : 'light_mode'}</span>
                    </div>
                    <div style={{
                      padding: '10px 14px', background: th === 'dark' ? '#222230' : '#eaeaf5',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid var(--accent)',
                        background: theme === th ? 'var(--accent)' : 'transparent',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: th === 'dark' ? '#fff' : '#1a1a2e' }}>
                        {th === 'dark' ? 'Тёмная' : 'Светлая'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* LANGUAGE TAB */}
        {tab === 'language' && (
          <>
            <div className="settings-title">Язык</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380 }}>
              {([['ru', 'Русский', 'Russian'], ['en', 'English', 'Английский']] as const).map(([l, label, sub]) => (
                <div key={l} onClick={() => setLang(l)} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                  borderRadius: 12, cursor: 'pointer',
                  border: `2px solid ${lang === l ? 'var(--accent)' : 'var(--divider)'}`,
                  background: lang === l ? 'var(--active)' : 'var(--bg-3)',
                  boxShadow: lang === l ? '0 0 16px var(--accent-glow)' : 'none',
                  transition: 'all .15s',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: lang === l ? 'var(--accent)' : 'var(--bg-input)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background .15s',
                  }}>
                    <span className="ms ms-lg filled" style={{ color: lang === l ? '#fff' : 'var(--text-3)' }}>language</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
                  </div>
                  {lang === l && <span className="ms ms-lg filled" style={{ marginLeft: 'auto', color: 'var(--accent)' }}>check_circle</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* VOICE TAB */}
        {tab === 'voice' && (
          <>
            <div className="settings-title">Голос и видео</div>
            <div style={{ padding: 28, borderRadius: 14, background: 'var(--bg-3)', border: '1px solid var(--divider)', textAlign: 'center' }}>
              <span className="ms" style={{ fontSize: 56, color: 'var(--accent-2)', fontVariationSettings: "'FILL' 1,'wght' 300" }}>spatial_audio_off</span>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>WebRTC Voice Chat</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6, maxWidth: 300, margin: '8px auto 0' }}>
                Голосовой чат работает через WebRTC P2P соединение. Нажми на голосовой канал в боковой панели чтобы подключиться.
              </div>
              <div style={{ marginTop: 16, display: 'inline-flex', gap: 6, alignItems: 'center', padding: '6px 14px', borderRadius: 20, background: 'rgba(74,222,128,0.12)', color: 'var(--green)', fontSize: 13, fontWeight: 600 }}>
                <span className="ms ms-sm filled">check_circle</span>
                STUN серверы Google
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
