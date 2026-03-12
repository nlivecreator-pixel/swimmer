'use client';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../../lib/store';

interface Props {
  userId: string;
  serverId?: string | null;   // if opened from a server context → show role
  anchorRect?: DOMRect | null;
  onClose: () => void;
  onDm?: () => void;
}

export default function UserProfileModal({ userId, serverId, anchorRect, onClose, onDm }: Props) {
  const { users, me, servers, setActiveDm, setDmMessages, addDmContact } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  const [imgErr, setImgErr] = useState(false);

  const u    = users.find(x => x.id === userId);
  if (!u) return null;

  const isMe = userId === me?.id;

  // Server context — find role
  const srv    = servers.find(s => s.id === (serverId ?? ''));
  const roleId = srv?.member_roles?.[userId];
  const role   = srv?.roles?.find((r: any) => r.id === roleId)
              || (srv ? srv.roles?.[0] : null);   // fallback: first role = default

  // All mutual servers
  const mutualServers = servers.filter(s => s.members?.includes(userId) && s.members?.includes(me?.id || ''));

  // Date helper
  function formatDate(iso?: string) {
    if (!iso) return null;
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Position
  const style: React.CSSProperties = { position: 'fixed', zIndex: 1000 };
  if (anchorRect) {
    const left = anchorRect.right + 12;
    const top  = anchorRect.top;
    style.left = Math.min(left, window.innerWidth - 300) + 'px';
    style.top  = Math.max(8, Math.min(top, window.innerHeight - 480)) + 'px';
  } else {
    style.top = '50%'; style.left = '50%';
    (style as any).transform = 'translate(-50%,-50%)';
  }

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    setTimeout(() => document.addEventListener('mousedown', handle), 10);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  async function startDm() {
    if (!me || !onDm) return;
    await fetch(`/api/dm_contacts/${me.id}`, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ contact_uid: userId }),
    });
    addDmContact(u);
    onDm();
  }

  // Banner color based on user color or role color
  const bannerColor  = role?.color || u.color || '#5a5ad8';
  const avatarUrl    = u.avatar_url && !imgErr ? `http://localhost:8000${u.avatar_url}` : null;

  return (
    <div ref={ref} style={{
      ...style,
      width: 280,
      borderRadius: 18,
      overflow: 'hidden',
      background: 'var(--bg-1)',
      border: '1px solid var(--glass-border)',
      boxShadow: '0 24px 72px rgba(0,0,0,.6)',
      animation: 'profilePop .18s cubic-bezier(.22,1,.36,1)',
    }}>
      <style>{`
        @keyframes profilePop {
          from { opacity:0; transform: scale(.94) translateY(6px); }
          to   { opacity:1; transform: scale(1)   translateY(0); }
        }
      `}</style>

      {/* ── Banner ── */}
      <div style={{
        height: 80, position: 'relative',
        background: `linear-gradient(135deg, ${bannerColor}cc, ${bannerColor}44)`,
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{ position:'absolute', width:120, height:120, borderRadius:'50%', background:`${bannerColor}30`, top:-40, right:-30 }} />
        <div style={{ position:'absolute', width:70,  height:70,  borderRadius:'50%', background:`${bannerColor}20`, top:20,  right:60 }} />

        <button onClick={onClose} style={{
          position:'absolute', top:8, right:8, width:26, height:26, borderRadius:'50%',
          background:'rgba(0,0,0,.4)', border:'none', cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', color:'#fff',
          backdropFilter:'blur(8px)',
        }}>
          <span className="ms" style={{ fontSize:15 }}>close</span>
        </button>
      </div>

      {/* ── Avatar row ── */}
      <div style={{ padding:'0 16px', display:'flex', alignItems:'flex-end', gap:10, marginTop:-36 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
          border: '4px solid var(--bg-1)', overflow:'hidden', background: u.color,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize: 26, fontWeight:800, color:'#fff',
          boxShadow: `0 0 0 2px ${bannerColor}40`,
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={u.name} onError={() => setImgErr(true)}
                style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            : u.letter}
        </div>

        {/* Online badge */}
        <div style={{
          marginBottom: 6,
          display:'flex', alignItems:'center', gap:5, padding:'3px 9px',
          borderRadius:20, fontSize:11, fontWeight:700,
          background: u.online ? 'rgba(74,222,128,.15)' : 'rgba(100,100,122,.15)',
          color: u.online ? 'var(--green)' : 'var(--text-3)',
          border: `1px solid ${u.online ? 'rgba(74,222,128,.3)' : 'rgba(100,100,122,.2)'}`,
        }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background: u.online ? 'var(--green)' : '#666' }} />
          {u.online ? 'Онлайн' : 'Не в сети'}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding:'10px 16px 16px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* Name + ID */}
        <div>
          <div style={{ fontSize:18, fontWeight:800, color: role?.color || 'var(--text)', lineHeight:1.2 }}>
            {u.name}
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3, display:'flex', gap:5, alignItems:'center' }}>
            <span className="ms" style={{ fontSize:12 }}>tag</span>
            <span style={{ fontFamily:'monospace', letterSpacing:'.02em' }}>{u.id.slice(0,12)}…</span>
          </div>
        </div>

        {/* ── Server role block (only shown when opened from a server) ── */}
        {srv && (
          <div style={{
            padding:'10px 12px', borderRadius:12,
            background:'var(--bg-3)', border:'1px solid var(--glass-border)',
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:8, display:'flex', gap:5, alignItems:'center' }}>
              <span className="ms" style={{ fontSize:12 }}>shield</span>
              {srv.name}
            </div>
            {/* Role pill */}
            <div style={{ display:'flex', alignItems:'center', gap:7, flexWrap:'wrap' }}>
              <div style={{
                display:'inline-flex', alignItems:'center', gap:5,
                padding:'4px 10px', borderRadius:20,
                background: `${role?.color || '#5a5ad8'}18`,
                border: `1px solid ${role?.color || '#5a5ad8'}44`,
                fontSize:12, fontWeight:700, color: role?.color || 'var(--accent-2)',
              }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background: role?.color || 'var(--accent)' }} />
                {role?.name || 'Участник'}
              </div>

              {/* Owner crown */}
              {srv.owner_id === userId && (
                <div style={{
                  display:'inline-flex', alignItems:'center', gap:4,
                  padding:'4px 9px', borderRadius:20,
                  background:'rgba(250,204,21,.12)', border:'1px solid rgba(250,204,21,.35)',
                  fontSize:12, fontWeight:700, color:'#facc15',
                }}>
                  <span className="ms filled" style={{ fontSize:12, color:'#facc15' }}>star</span>
                  Владелец
                </div>
              )}
            </div>

            {/* Role permissions preview */}
            {role?.permissions && (
              <div style={{ marginTop:8, display:'flex', gap:4, flexWrap:'wrap' }}>
                {(role.permissions as string[]).map((p: string) => (
                  <span key={p} style={{
                    fontSize:10, padding:'2px 7px', borderRadius:10,
                    background:'var(--bg-2)', color:'var(--text-3)',
                    border:'1px solid var(--divider)',
                  }}>
                    {PERM_LABELS[p] || p}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Bio ── */}
        {u.bio ? (
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:5, display:'flex', gap:5, alignItems:'center' }}>
              <span className="ms" style={{ fontSize:12 }}>info</span>
              Обо мне
            </div>
            <div style={{
              padding:'9px 11px', borderRadius:10, background:'var(--bg-3)',
              fontSize:13, color:'var(--text-2)', lineHeight:1.6,
              border:'1px solid var(--glass-border)',
              whiteSpace:'pre-wrap', wordBreak:'break-word',
            }}>
              {u.bio}
            </div>
          </div>
        ) : !isMe && (
          <div style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic', textAlign:'center', padding:'4px 0' }}>
            Нет описания
          </div>
        )}

        {/* ── Registration date ── */}
        {(u as any).created_at && (
          <div style={{ fontSize:11, color:'var(--text-3)', display:'flex', gap:6, alignItems:'center' }}>
            <span className="ms" style={{ fontSize:14 }}>calendar_today</span>
            Зарегистрирован {formatDate((u as any).created_at)}
          </div>
        )}

        {/* ── Mutual servers ── */}
        {!isMe && mutualServers.length > 0 && (
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6, display:'flex', gap:5, alignItems:'center' }}>
              <span className="ms" style={{ fontSize:12 }}>groups</span>
              Общие серверы ({mutualServers.length})
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {mutualServers.map(s => (
                <div key={s.id} title={s.name} style={{
                  width:30, height:30, borderRadius:10, overflow:'hidden',
                  background:'var(--bg-3)', display:'flex', alignItems:'center',
                  justifyContent:'center', fontSize:16, cursor:'default',
                  border:'1px solid var(--glass-border)',
                }}>
                  {s.image_url
                    ? <img src={`http://localhost:8000${s.image_url}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : s.icon || '🌐'}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div style={{ display:'flex', gap:8, marginTop:2 }}>
          {!isMe && (
            <button
              className="btn btn-primary btn-sm"
              style={{ flex:1, justifyContent:'center', gap:6 }}
              onClick={startDm}
            >
              <span className="ms ms-sm">chat</span>
              Написать
            </button>
          )}
          {isMe && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex:1, justifyContent:'center', gap:6 }}
              onClick={() => { onClose(); useStore.getState().setShowSettings(true); }}
            >
              <span className="ms ms-sm">edit</span>
              Редактировать
            </button>
          )}
          {!isMe && (
            <button className="btn btn-ghost btn-sm" style={{ padding:'0 10px' }} title="Упомянуть">
              <span className="ms ms-sm">alternate_email</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const PERM_LABELS: Record<string, string> = {
  read:   '👁 Чтение',
  send:   '✉️ Писать',
  delete: '🗑 Удалять',
  kick:   '🚫 Кик',
  manage: '⚙️ Управление',
  news:   '📢 Новости',
};
