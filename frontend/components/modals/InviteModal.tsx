'use client';
import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';

export default function InviteModal({ sid }: { sid: string }) {
  const { servers, setShowInvite, me, t } = useStore();
  const srv = servers.find(s => s.id === sid);
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied,    setCopied]    = useState(false);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { createInvite(); }, []);

  async function createInvite() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/servers/${sid}/invites`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: me?.id }),
      });
      const data = await res.json();
      setInviteUrl(data.url);
    } catch {}
    setLoading(false);
  }

  function copy() {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && setShowInvite(null)}>
      <div className="modal" style={{ width: 460, padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 22 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: 'var(--accent-subtle)', border: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="ms ms-lg filled" style={{ color: 'var(--accent-2)' }}>person_add</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{t('invite_link')}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>{srv?.name}</div>
          </div>
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setShowInvite(null)}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>

        {/* Server card */}
        <div className="invite-card" style={{ marginBottom: 22 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%', fontSize: 24, flexShrink: 0,
            background: 'linear-gradient(135deg,#5a5ad8,#9b5de5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {srv?.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{srv?.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
              <span className="ms ms-sm">group</span>
              {srv?.members.length} участников
            </div>
          </div>
          <div className="badge badge-green">
            <span className="ms ms-sm filled">check_circle</span>
            {t('invite_valid')}
          </div>
        </div>

        <label className="field-label">{t('invite_link')}</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="field"
            value={loading ? 'Создание ссылки...' : inviteUrl}
            readOnly
            style={{ flex: 1, fontSize: 13 }}
          />
          <button className="btn btn-primary" onClick={copy} style={{ flexShrink: 0 }}>
            <span className="ms ms-sm filled">{copied ? 'check' : 'content_copy'}</span>
            {copied ? t('copied') : t('copy_link')}
          </button>
        </div>

        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 10,
          background: 'var(--accent-subtle)', border: '1px solid var(--glass-border)',
          fontSize: 13, color: 'var(--text-2)', display: 'flex', gap: 8, alignItems: 'center',
        }}>
          <span className="ms ms-sm filled" style={{ color: 'var(--accent-2)', flexShrink: 0 }}>info</span>
          Ссылка действительна бессрочно. Поделись с друзьями!
        </div>
      </div>
    </div>
  );
}
