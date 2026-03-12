'use client';
import { useState } from 'react';
import { useStore } from '../../lib/store';
import { socket } from '../../lib/socket';
import { generateKeyPair, exportPublicKey } from '../../lib/crypto';

export default function AuthScreen({ sessionError = '' }: { sessionError?: string }) {
  const { setMe } = useStore();
  const [tab, setTab]           = useState<'login' | 'register'>('login');
  const [username, setUsername]  = useState('');
  const [password, setPassword]  = useState('');
  const [error, setError]        = useState(sessionError);
  const [loading, setLoading]    = useState(false);

  async function submit() {
    if (!username.trim() || !password.trim()) { setError('Заполни все поля'); return; }
    setLoading(true); setError('');
    try {
      const kp = await generateKeyPair();
      const pubKeyStr = await exportPublicKey(kp.publicKey);
      (window as any).__e2eKeyPair = kp;

      const url  = tab === 'login' ? '/api/login' : '/api/register';
      const body = tab === 'login'
        ? { username, password, public_key: pubKeyStr }
        : { username, password };

      const res  = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) { setError(data.detail || 'Ошибка'); setLoading(false); return; }

      if (tab === 'register') {
        const lr = await fetch('/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, public_key: pubKeyStr }),
        });
        const ld = await lr.json();
        if (!lr.ok) { setError(ld.detail || 'Ошибка входа'); setLoading(false); return; }
        localStorage.setItem('swimer_me', JSON.stringify(ld));
        setMe(ld); socket.connect(ld.id);
      } else {
        localStorage.setItem('swimer_me', JSON.stringify(data));
        setMe(data); socket.connect(data.id);
      }
    } catch { setError('Ошибка сети. Запущен ли бэкенд?'); }
    setLoading(false);
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        {/* Logo — pure Material Symbol */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
          background: 'linear-gradient(135deg,#5a5ad8,#7c7cf5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(90,90,216,0.5)',
        }}>
          <span className="ms" style={{
            fontSize: 38, color: '#fff',
            fontVariationSettings: "'FILL' 1,'wght' 500,'GRAD' 0,'opsz' 48",
          }}>water</span>
        </div>

        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-.5px', marginBottom: 4 }}>Swimer</div>
        <div style={{ fontSize: 14, color: 'var(--text-3)', marginBottom: 28 }}>
          {tab === 'login' ? 'Войди в аккаунт' : 'Создай аккаунт'}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 26, background: 'var(--bg-input)', borderRadius: 12, padding: 4 }}>
          {(['login', 'register'] as const).map(tp => (
            <button key={tp} onClick={() => setTab(tp)} style={{
              flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer', border: 'none',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
              background: tab === tp ? 'linear-gradient(135deg,#5a5ad8,#7c7cf5)' : 'transparent',
              color: tab === tp ? '#fff' : 'var(--text-3)',
              boxShadow: tab === tp ? '0 0 18px rgba(90,90,216,0.4)' : 'none',
              transition: 'all .2s',
            }}>
              {tp === 'login' ? 'Войти' : 'Регистрация'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 4 }}>
          <div style={{ position: 'relative' }}>
            <span className="ms" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-3)', fontSize: 18, pointerEvents: 'none',
            }}>person</span>
            <input className="field" placeholder="Имя пользователя"
              value={username} onChange={e => setUsername(e.target.value)}
              style={{ paddingLeft: 40 }} onKeyDown={e => e.key === 'Enter' && submit()} autoFocus />
          </div>
          <div style={{ position: 'relative' }}>
            <span className="ms" style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-3)', fontSize: 18, pointerEvents: 'none',
            }}>lock</span>
            <input className="field" type="password" placeholder="Пароль"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ paddingLeft: 40 }} onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span className="ms ms-sm">error</span>{error}
          </div>
        )}

        <button className="btn btn-primary" onClick={submit} disabled={loading}
          style={{ width: '100%', marginTop: 20, padding: '13px', fontSize: 15, justifyContent: 'center' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="ms ms-sm" style={{ animation: 'spin .8s linear infinite' }}>progress_activity</span>
              Загрузка...
            </span>
          ) : (
            <>
              <span className="ms ms-sm">{tab === 'login' ? 'login' : 'person_add'}</span>
              {tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
            </>
          )}
        </button>

        <div style={{
          marginTop: 18, fontSize: 12, color: 'var(--text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span className="ms ms-sm filled" style={{ color: 'var(--green)' }}>verified_user</span>
          End-to-end шифрование включено
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
