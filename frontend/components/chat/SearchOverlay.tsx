'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';

export default function SearchOverlay() {
  const { setSearchQuery, setActiveDm, setDmMessages, me, users, t } = useStore();
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { inputRef.current?.focus(); }, []);

  function close() { setSearchQuery(null as any); }

  function search(q: string) {
    setQuery(q);
    clearTimeout(debounce.current);
    if (!q.trim()) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(q)}`);
        setResults(await res.json());
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }

  async function openDm(u: any) {
    if (!me) return;
    setActiveDm(u.id);
    const msgs = await fetch(`/api/dm/${me.id}/${u.id}`).then(r => r.json());
    setDmMessages([me.id, u.id].sort().join('__'), msgs);
    useStore.getState().setActiveServer('');
    close();
  }

  const localResults = users.filter(u =>
    u.id !== me?.id && u.name.toLowerCase().includes(query.replace('@', '').toLowerCase())
  );
  const displayResults = query.trim() ? (results.length ? results : localResults) : [];

  return (
    <div
      className="search-overlay"
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div className="search-box">
        {/* Input row */}
        <div className="search-input-row">
          <span className="ms ms-lg" style={{ color: 'var(--text-3)', flexShrink: 0 }}>search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => search(e.target.value)}
            placeholder={`${t('username_placeholder')} или название`}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 16, color: 'var(--text)', fontFamily: 'inherit',
            }}
          />
          {query && (
            <button className="icon-btn" onClick={() => { setQuery(''); setResults([]); }}>
              <span className="ms ms-sm">close</span>
            </button>
          )}
          <kbd style={{
            padding: '3px 7px', borderRadius: 5, fontSize: 11, fontWeight: 700,
            background: 'var(--bg-3)', border: '1px solid var(--divider)', color: 'var(--text-3)',
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflowY: 'auto', padding: '6px 0' }}>
          {loading && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)' }}>
              <span className="ms ms-lg" style={{ animation: 'spin .8s linear infinite' }}>
                progress_activity
              </span>
            </div>
          )}

          {!loading && query && displayResults.length === 0 && (
            <div style={{ padding: '28px', textAlign: 'center', color: 'var(--text-3)' }}>
              <span className="ms" style={{ fontSize: 44, opacity: .35, display: 'block', marginBottom: 8 }}>
                person_search
              </span>
              <div style={{ fontSize: 14 }}>{t('no_results')} — <b style={{ color: 'var(--text-2)' }}>{query}</b></div>
            </div>
          )}

          {!loading && displayResults.map((u: any) => (
            <div key={u.id} className="search-result" onClick={() => openDm(u)}>
              <div className="avatar av-md" style={{ background: u.color, position: 'relative' }}>
                {u.letter}
                {u.online && <div className="online-dot" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>@{u.name}</div>
                <div style={{ fontSize: 12, color: u.online ? 'var(--green)' : 'var(--text-3)' }}>
                  {u.online ? t('online') : t('offline')}
                </div>
              </div>
              <button className="btn btn-ghost btn-sm">
                <span className="ms ms-sm">chat</span>
                {t('dm_open')}
              </button>
            </div>
          ))}

          {/* Quick jump when no query */}
          {!query && (
            <div style={{ padding: '16px 18px', color: 'var(--text-3)', fontSize: 13 }}>
              <div style={{ marginBottom: 10, fontWeight: 700, color: 'var(--text-2)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span className="ms ms-sm">bolt</span>
                Быстрый переход
              </div>
              {users.filter(u => u.id !== me?.id).slice(0, 5).map(u => (
                <div key={u.id} className="search-result" style={{ borderRadius: 8, padding: '8px 10px' }}
                  onClick={() => openDm(u)}>
                  <div className="avatar av-sm" style={{ background: u.color, position: 'relative' }}>
                    {u.letter}
                    {u.online && <div className="online-dot" />}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>@{u.name}</span>
                  {u.online && (
                    <span className="badge badge-green" style={{ marginLeft: 'auto', display: 'inline-flex', gap: 3 }}>
                      <span className="ms ms-sm filled">circle</span>онлайн
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
