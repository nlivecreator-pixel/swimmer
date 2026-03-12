'use client';
import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import AuthScreen from './chat/AuthScreen';
import AppShell from './chat/AppShell';

export default function App() {
  const { me, setMe, logout } = useStore();
  const [hydrated, setHydrated] = useState(false);
  const [sessionError, setSessionError] = useState('');

  useEffect(() => {
    async function init() {
      try {
        const t = localStorage.getItem('swimer_theme') as any;
        const l = localStorage.getItem('swimer_lang') as any;
        if (t) { useStore.getState().setTheme(t); document.documentElement.setAttribute('data-theme', t); }
        if (l) useStore.getState().setLang(l);

        const saved = localStorage.getItem('swimer_me');
        if (saved) {
          const user = JSON.parse(saved);
          // Verify session is still valid with backend
          try {
            const res = await fetch(`/api/session/${user.id}`);
            if (res.ok) {
              const fresh = await res.json();
              setMe({ ...user, ...fresh }); // merge fresh data (updated name/avatar/etc)
            } else {
              // Session expired (backend restarted, user gone from memory)
              localStorage.removeItem('swimer_me');
              setSessionError('Сессия истекла — войдите снова');
            }
          } catch {
            // Backend unreachable — still set me from localStorage so UI loads
            setMe(user);
          }
        }
      } catch {}
      setHydrated(true);
    }
    init();
  }, []);

  if (!hydrated) return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-deep)', gap: 16,
    }}>
      <span className="ms" style={{
        fontSize: 52, color: 'var(--accent)',
        animation: 'spin 1.2s linear infinite',
        fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 48",
      }}>water</span>
      <span style={{ color: 'var(--text-3)', fontSize: 14, fontWeight: 600, letterSpacing: 2 }}>
        SWIMER
      </span>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (!me) return <AuthScreen sessionError={sessionError} />;
  return <AppShell />;
}
