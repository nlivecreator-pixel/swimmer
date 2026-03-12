'use client';
import { useState, useRef } from 'react';
import { useStore } from '../../lib/store';

type Tab = 'account' | 'profile' | 'appearance' | 'language' | 'voice';

const AVATAR_COLORS = [
  '#5a5ad8','#e85a9a','#5ae8b8','#e8a85a','#a85ae8',
  '#5ae8e8','#e85a5a','#5ae85a','#e8e85a','#5ab8e8','#e85ae8','#ff6b6b',
];

export default function SettingsModal() {
  const { me, setShowSettings, theme, setTheme, lang, setLang, t, updateMe, logout } = useStore();
  const [tab,   setTab]   = useState<Tab>('profile');
  const [name,  setName]  = useState(me?.name  || '');
  const [bio,   setBio]   = useState(me?.bio   || '');
  const [color, setColor] = useState(me?.color || '#5a5ad8');
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function saveProfile() {
    if (!me) return;
    const res  = await fetch(`/api/users/${me.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bio, color }),
    });
    const data = await res.json();
    updateMe(data);
    const saved = JSON.parse(localStorage.getItem('swimer_me') || '{}');
    localStorage.setItem('swimer_me', JSON.stringify({ ...saved, ...data }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function uploadAvatar(file: File) {
    if (!me) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const res  = await fetch(`/api/users/${me.id}/avatar`, { method: 'POST', body: fd });
      const data = await res.json();
      updateMe(data);
      const s = JSON.parse(localStorage.getItem('swimer_me') || '{}');
      localStorage.setItem('swimer_me', JSON.stringify({ ...s, ...data }));
    } catch { alert('Ошибка загрузки'); }
  }

  const navItems: { id: Tab; icon: string; label: string }[] = [
    { id: 'account',    icon: 'manage_accounts', label: t('my_account') },
    { id: 'profile',    icon: 'person',          label: t('profile') },
    { id: 'appearance', icon: 'palette',         label: t('appearance') },
    { id: 'language',   icon: 'language',        label: t('language') },
    { id: 'voice',      icon: 'mic',             label: t('voice_video') },
  ];

  return (
    <div className="settings-overlay">
      <button className="settings-close" onClick={() => setShowSettings(false)}>
        <span className="ms ms-lg">close</span>
      </button>

      {/* ── Left nav ── */}
      <div className="settings-left">
        <div className="settings-nav-section">{t('settings')}</div>
        {navItems.map(n => (
          <div key={n.id}
            className={`settings-nav-item${tab === n.id ? ' active' : ''}`}
            onClick={() => setTab(n.id)}>
            <span className="ms ms-sm">{n.icon}</span>
            {n.label}
          </div>
        ))}
        <div style={{ height: 1, background: 'var(--divider)', margin: '12px 0' }} />
        <div className="settings-nav-item" onClick={logout}>
          <span className="ms ms-sm" style={{ color: 'var(--red)' }}>logout</span>
          <span style={{ color: 'var(--red)' }}>{t('logout')}</span>
        </div>
      </div>

      {/* ── Right content ── */}
      <div className="settings-right">

        {/* ACCOUNT */}
        {tab === 'account' && (
          <>
            <div className="settings-title">{t('my_account')}</div>
            <div className="profile-card">
              <div className="profile-card-banner" style={{ background: `linear-gradient(135deg,${color},${color}99)` }} />
              <div className="profile-card-body">
                <div className="profile-avatar-wrap" onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer' }}>
                  <div className="avatar" style={{ background: color, width: 64, height: 64, fontSize: 26, borderRadius: '50%' }}>
                    {me?.letter}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                <div style={{ fontSize: 18, fontWeight: 800 }}>{me?.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 2 }}>#{me?.id}</div>
                {me?.bio && <div style={{ fontSize: 14, marginTop: 8, color: 'var(--text-2)' }}>{me.bio}</div>}
              </div>
            </div>
          </>
        )}

        {/* PROFILE */}
        {tab === 'profile' && (
          <>
            <div className="settings-title">{t('edit_profile')}</div>

            <div className="settings-section">
              <div className="settings-label">{t('change_avatar')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="avatar" style={{ background: color, width: 80, height: 80, fontSize: 30, borderRadius: '50%', cursor: 'pointer' }}
                  onClick={() => fileRef.current?.click()}>
                  {me?.letter}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && uploadAvatar(e.target.files[0])} />
                <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                  <span className="ms ms-sm">upload</span>
                  {t('change_avatar')}
                </button>
              </div>
            </div>

            <div className="settings-divider" />

            <div className="settings-section">
              <div className="field-group">
                <label className="field-label">Имя пользователя</label>
                <input className="field" value={name} onChange={e => setName(e.target.value)} placeholder="Username" />
              </div>
              <div className="field-group">
                <label className="field-label">{t('about_me')}</label>
                <textarea className="field" value={bio} onChange={e => setBio(e.target.value)}
                  placeholder={t('bio_placeholder')} rows={4} style={{ resize: 'vertical', lineHeight: 1.5 }} />
              </div>
            </div>

            <div className="settings-divider" />

            <div className="settings-section">
              <div className="settings-label">Цвет аватара</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AVATAR_COLORS.map(c => (
                  <div key={c}
                    onClick={() => setColor(c)}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: color === c ? '3px solid white' : '3px solid transparent',
                      boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                      transition: 'transform .12s', transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    }} />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={saveProfile}>
                <span className="ms ms-sm">{saved ? 'check_circle' : 'save'}</span>
                {saved ? 'Сохранено!' : t('save')}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowSettings(false)}>
                <span className="ms ms-sm">close</span>
                {t('cancel')}
              </button>
            </div>
          </>
        )}

        {/* APPEARANCE */}
        {tab === 'appearance' && (
          <>
            <div className="settings-title">{t('appearance')}</div>
            <div className="settings-section">
              <div className="settings-label">Тема</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {(['dark', 'light'] as const).map(th => (
                  <div
                    key={th}
                    onClick={() => setTheme(th)}
                    style={{
                      width: 150, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                      border: `2px solid ${theme === th ? 'var(--accent)' : 'var(--divider)'}`,
                      transition: 'border-color .15s',
                    }}>
                    <div style={{
                      height: 90,
                      background: th === 'dark'
                        ? 'linear-gradient(135deg,#1a1a20,#0d0d12)'
                        : 'linear-gradient(135deg,#ffffff,#f0f0f8)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="ms" style={{
                        fontSize: 40, color: th === 'dark' ? '#7c7cf5' : '#5a5ad8',
                        fontVariationSettings: "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 48",
                      }}>
                        {th === 'dark' ? 'dark_mode' : 'light_mode'}
                      </span>
                    </div>
                    <div style={{
                      padding: '10px 14px',
                      background: th === 'dark' ? '#222230' : '#eaeaf5',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid var(--accent)',
                        background: theme === th ? 'var(--accent)' : 'transparent',
                        transition: 'background .15s',
                      }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: th === 'dark' ? '#fff' : '#1a1a2e' }}>
                        {th === 'dark' ? t('dark_theme') : t('light_theme')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* LANGUAGE */}
        {tab === 'language' && (
          <>
            <div className="settings-title">{t('language')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
              {([
                ['ru', 'Русский',  'Русский язык'],
                ['en', 'English',  'English language'],
              ] as const).map(([l, label, sub]) => (
                <div
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                    borderRadius: 12,
                    border: `2px solid ${lang === l ? 'var(--accent)' : 'var(--divider)'}`,
                    cursor: 'pointer', transition: 'border-color .15s,background .15s',
                    background: lang === l ? 'var(--active)' : 'var(--bg-3)',
                  }}>
                  {/* Language icon — Material Symbol, not flag emoji */}
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: lang === l ? 'var(--accent)' : 'var(--bg-input)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background .15s',
                  }}>
                    <span className="ms ms-lg filled" style={{ color: lang === l ? '#fff' : 'var(--text-3)' }}>
                      language
                    </span>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>
                  </div>
                  {lang === l && (
                    <span className="ms ms-lg filled" style={{ marginLeft: 'auto', color: 'var(--accent)' }}>
                      check_circle
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* VOICE */}
        {tab === 'voice' && (
          <>
            <div className="settings-title">{t('voice_video')}</div>
            <div className="settings-section">
              <div style={{
                padding: 24, borderRadius: 14, background: 'var(--bg-3)',
                border: '1px solid var(--divider)', textAlign: 'center',
              }}>
                <span className="ms" style={{
                  fontSize: 56, color: 'var(--accent-2)',
                  fontVariationSettings: "'FILL' 1,'wght' 300,'GRAD' 0,'opsz' 48",
                }}>spatial_audio_off</span>
                <div style={{ fontSize: 15, fontWeight: 700, marginTop: 10 }}>WebRTC Voice Chat</div>
                <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 6, maxWidth: 320, margin: '8px auto 0' }}>
                  Голосовой чат работает через WebRTC P2P соединение.
                  Нажми на голосовой канал чтобы подключиться.
                  Требуется разрешение на использование микрофона.
                </div>
                <div className="badge badge-green" style={{ marginTop: 14, display: 'inline-flex' }}>
                  <span className="ms ms-sm filled">check_circle</span>
                  STUN серверы Google
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
