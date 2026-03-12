'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore, Message } from '../../lib/store';
import { socket } from '../../lib/socket';
import { decryptMessage, getCachedKey } from '../../lib/crypto';
import PollWidget from '../modals/PollWidget';
import UserProfileModal from '../modals/UserProfileModal';

function fmtSize(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
const QUICK_REACTIONS = ['👍', '❤️', '😂', '🔥', '😮', '😢'];

function AvatarImg({ user, size = 36, onClick, style }: any) {
  return (
    <div
      onClick={onClick}
      title={user?.name}
      style={{
        width: size, height: size, borderRadius: '50%', overflow: 'hidden',
        flexShrink: 0, cursor: onClick ? 'pointer' : 'default',
        background: user?.color || '#5a5ad8',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 700, color: '#fff',
        transition: 'transform .12s, box-shadow .12s',
        ...(onClick ? { ':hover': { transform: 'scale(1.1)' } } : {}),
        ...style,
      }}
    >
      {user?.avatar_url ? (
        <img src={`http://localhost:8000${user.avatar_url}`} alt={user.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        user?.letter || '?'
      )}
    </div>
  );
}

function MessageRow({ msg, isOwn, sender, onReact, onReply, onDelete, prevMsg, onProfileClick }: any) {
  const [hover, setHover] = useState(false);
  const [decrypted, setDecrypted] = useState<string | null>(null);
  const { me } = useStore();

  useEffect(() => {
    if (!msg.encrypted || !msg.text) return;
    const pid = isOwn ? msg.to_uid : msg.from_uid;
    if (!pid) return;
    const k = getCachedKey(pid); if (!k) return;
    decryptMessage(msg.text, k).then(setDecrypted).catch(() => setDecrypted('[зашифровано]'));
  }, [msg.text, msg.encrypted]);

  const txt   = msg.encrypted ? (decrypted ?? '···') : msg.text;
  const total = Object.values(msg.reactions || {}).reduce((s: number, a: any) => s + a.length, 0);
  const prevSid = prevMsg?.uid || prevMsg?.from_uid;
  const thisSid = msg.uid || msg.from_uid;
  const isContinuation = prevSid === thisSid && !msg.reply_to;

  return (
    <div
      className="msg-row"
      style={{ flexDirection: isOwn ? 'row-reverse' : 'row', alignItems: 'flex-end', paddingTop: isContinuation ? 1 : 8 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar slot */}
      <div style={{ width: 36, flexShrink: 0 }}>
        {!isContinuation && (
          <div style={{ position: 'relative' }}>
            <AvatarImg user={sender} size={36} onClick={(e: any) => onProfileClick(thisSid, e)} />
            {sender?.online && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 10, height: 10, borderRadius: '50%',
                background: 'var(--green)', border: '2px solid var(--bg-1)',
                pointerEvents: 'none',
              }} />
            )}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 3, alignItems: isOwn ? 'flex-end' : 'flex-start', minWidth: 0 }}>
        {/* Name row — clickable */}
        {!isContinuation && (
          <div style={{
            display: 'flex', gap: 7, alignItems: 'center',
            paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0,
            flexDirection: isOwn ? 'row-reverse' : 'row',
          }}>
            <span
              style={{ fontSize: 13, fontWeight: 700, color: sender?.color || 'var(--accent-2)', cursor: 'pointer' }}
              onClick={(e) => onProfileClick(thisSid, e)}
            >
              {sender?.name || '?'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{msg.ts}</span>
            {msg.encrypted && (
              <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: 'var(--accent-subtle)', color: 'var(--accent-2)', display: 'flex', gap: 3, alignItems: 'center' }}>
                <span className="ms filled" style={{ fontSize: 10 }}>lock</span>E2E
              </span>
            )}
          </div>
        )}

        {/* Reply preview */}
        {msg.reply_to && (
          <div style={{
            display: 'flex', gap: 6, padding: '3px 10px', borderRadius: '7px 7px 0 0',
            background: 'var(--accent-subtle)', borderLeft: '2px solid var(--accent)',
            fontSize: 12, color: 'var(--text-3)', maxWidth: 480,
          }}>
            <span className="ms" style={{ fontSize: 13, flexShrink: 0 }}>reply</span>
            {msg.reply_to.text?.slice(0, 60)}
          </div>
        )}

        {/* Content */}
        {msg.type === 'sticker' ? (
          <div style={{ fontSize: 68, lineHeight: 1, padding: '4px 0' }}>{msg.sticker?.emoji}</div>
        ) : msg.type === 'image' ? (
          <div style={{ borderRadius: 14, overflow: 'hidden', maxWidth: 360 }}>
            <img src={`http://localhost:8000${msg.file?.url}`} alt=""
              style={{ display: 'block', maxWidth: '100%', maxHeight: 320, objectFit: 'cover' }} />
            {txt && <div className={`msg-bubble${isOwn ? ' own' : ''}`} style={{ borderRadius: '0 0 14px 14px' }}>{txt}</div>}
          </div>
        ) : msg.type === 'file' ? (
          <div className="file-preview">
            <div className="file-icon">
              <span className="ms filled" style={{ fontSize: 22, color: 'var(--accent-2)' }}>description</span>
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.file?.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{msg.file?.size ? fmtSize(msg.file.size) : ''}</div>
            </div>
            <a href={`http://localhost:8000${msg.file?.url}`} download target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent-2)', flexShrink: 0 }}>
              <span className="ms ms-lg">download</span>
            </a>
          </div>
        ) : msg.type === 'poll' ? (
          <div className={`msg-bubble${isOwn ? ' own' : ''}`} style={{ minWidth: 290 }}>
            {txt && <p style={{ marginBottom: 8, fontSize: 14 }}>{txt}</p>}
            {msg.poll && <PollWidget poll={msg.poll} />}
          </div>
        ) : txt ? (
          <div className={`msg-bubble${isOwn ? ' own' : ''}`}>{txt}</div>
        ) : null}

        {/* Reactions */}
        {total > 0 && (
          <div className="reaction-row">
            {Object.entries(msg.reactions || {}).map(([e, v]: any) =>
              v.length > 0 ? (
                <button key={e} className={`reaction-chip${v.includes(me?.id) ? ' mine' : ''}`}
                  onClick={() => onReact(msg.id, e)}>
                  {e}<span style={{ color: 'var(--text-2)', fontWeight: 700 }}>{v.length}</span>
                </button>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hover && (
        <div className="msg-actions">
          {QUICK_REACTIONS.map(e => (
            <button key={e} className="msg-act-btn" onClick={() => onReact(msg.id, e)} style={{ fontSize: 17 }}>{e}</button>
          ))}
          <div style={{ width: 1, background: 'var(--divider)', margin: '0 2px' }} />
          <button className="msg-act-btn" title="Ответить" onClick={() => onReply(msg)}>
            <span className="ms ms-sm">reply</span>
          </button>
          {isOwn && (
            <button className="msg-act-btn" title="Удалить" onClick={() => onDelete(msg.id)} style={{ color: 'var(--red)' }}>
              <span className="ms ms-sm">delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function MessageList() {
  const {
    activeChannelId, activeDmUid, messages, dmMessages, users, me, setReplyTo,
    setActiveDm, setDmMessages, setActiveServer, activeServerId,
  } = useStore();

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);

  // Profile popup state
  const [profileUid,   setProfileUid]   = useState<string | null>(null);
  const [profileRect,  setProfileRect]  = useState<DOMRect | null>(null);

  const msgs: Message[] = activeChannelId
    ? messages[activeChannelId] || []
    : activeDmUid && me
      ? dmMessages[[me.id, activeDmUid].sort().join('__')] || []
      : [];

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' });
    setShowScrollBtn(false); setUnreadCount(0); isAtBottom.current = true;
  }, []);

  useEffect(() => { scrollToBottom(false); }, [activeChannelId, activeDmUid]);

  useEffect(() => {
    if (!msgs.length) return;
    if (isAtBottom.current) scrollToBottom(true);
    else { setUnreadCount(c => c + 1); setShowScrollBtn(true); }
  }, [msgs.length]);

  const onScroll = useCallback(() => {
    const el = listRef.current; if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAtBottom.current = atBottom;
    if (atBottom) { setShowScrollBtn(false); setUnreadCount(0); }
  }, []);

  function handleReact(mid: string, emoji: string) {
    socket.send({ type: 'react', message_id: mid, emoji, channel_id: activeChannelId, dm_partner: activeDmUid });
  }
  function handleDelete(mid: string) {
    socket.send({ type: 'delete_msg', message_id: mid, channel_id: activeChannelId });
  }

  function handleProfileClick(uid: string, e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setProfileUid(uid); setProfileRect(rect);
  }

  async function openDm(uid: string) {
    setProfileUid(null);
    if (!me || uid === me.id) return;
    setActiveServer('');
    setActiveDm(uid);
    const msgs = await fetch(`/api/dm/${me.id}/${uid}`).then(r => r.json());
    setDmMessages([me.id, uid].sort().join('__'), msgs);
  }

  if (!msgs.length) return (
    <div className="messages-list" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', color: 'var(--text-3)', paddingBottom: 48 }}>
        <span className="ms" style={{
          fontSize: 56, display: 'block', marginBottom: 12, opacity: .3,
          color: 'var(--accent)', fontVariationSettings: "'FILL' 1,'wght' 300",
        }}>chat_bubble</span>
        <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>Начни разговор!</div>
        <div style={{ fontSize: 13 }}>Здесь будут появляться сообщения</div>
      </div>
      <div ref={bottomRef} />
    </div>
  );

  return (
    <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div ref={listRef} className="messages-list" onScroll={onScroll}>
        {msgs.map((msg, i) => {
          const sid   = msg.uid || msg.from_uid;
          const isOwn = sid === me?.id;
          return (
            <MessageRow
              key={msg.id} msg={msg} isOwn={isOwn}
              sender={users.find(u => u.id === sid)}
              prevMsg={i > 0 ? msgs[i - 1] : null}
              onReact={handleReact}
              onReply={(m: Message) => setReplyTo(m)}
              onDelete={handleDelete}
              onProfileClick={handleProfileClick}
            />
          );
        })}
        <div ref={bottomRef} style={{ height: 1 }} />
      </div>

      {/* Scroll-to-bottom button */}
      {showScrollBtn && (
        <button onClick={() => scrollToBottom(true)} style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '8px 18px', borderRadius: 20,
          background: 'var(--accent)', color: '#fff', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 20px rgba(90,90,216,0.5)',
          animation: 'slideUp .2s ease', zIndex: 10,
        }}>
          {unreadCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.25)', borderRadius: 10, padding: '1px 7px', fontSize: 12, fontWeight: 800 }}>
              {unreadCount}
            </span>
          )}
          Новые сообщения
          <span className="ms ms-sm filled">keyboard_double_arrow_down</span>
        </button>
      )}

      {/* Profile popup */}
      {profileUid && (
        <UserProfileModal
          userId={profileUid}
          serverId={activeServerId || null}
          anchorRect={profileRect}
          onClose={() => { setProfileUid(null); setProfileRect(null); }}
          onDm={() => openDm(profileUid)}
        />
      )}

      <style>{`
        @keyframes slideUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}
      `}</style>
    </div>
  );
}
