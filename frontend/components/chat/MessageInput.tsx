'use client';
import { useRef, useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { socket } from '../../lib/socket';
import { encryptMessage, getCachedKey, deriveSharedKey, importPublicKey, setCachedKey } from '../../lib/crypto';
import EmojiPickerPopover from '../modals/EmojiPickerPopover';
import StickerPicker from '../modals/StickerPicker';
import PollModal from '../modals/PollModal';

function canWriteNews(srv: any, uid: string) {
  if (!srv) return true;
  if (uid === srv.owner_id) return true;
  const roleId = srv.member_roles?.[uid];
  const role   = srv.roles?.find((r: any) => r.id === roleId);
  const perms: string[] = role?.permissions || srv.roles?.[0]?.permissions || ['read','send'];
  return perms.includes('manage') || perms.includes('news');
}

export default function MessageInput() {
  const { activeChannelId, activeDmUid, me, replyTo, setReplyTo, t, servers, activeServerId } = useStore();
  const [text,          setText]          = useState('');
  const [showEmoji,     setShowEmoji]     = useState(false);
  const [showSticker,   setShowSticker]   = useState(false);
  const [showPoll,      setShowPoll]      = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploading,     setUploading]     = useState(false);
  const [wsError,       setWsError]       = useState('');
  const fileRef         = useRef<HTMLInputElement>(null);
  const typingTimeout   = useRef<ReturnType<typeof setTimeout>|null>(null);

  const activeSrv      = servers.find(s => s.id === activeServerId);
  const serverStickers = activeSrv?.stickers || [];

  // Find active channel type
  const activeChannel = activeSrv?.channels.find(c => c.id === activeChannelId);
  const isNewsChannel = activeChannel?.type === 'news';
  const newsBlocked   = isNewsChannel && me ? !canWriteNews(activeSrv, me.id) : false;

  // Listen for permission errors from backend
  useEffect(() => {
    const onError = (msg: any) => {
      setWsError(msg.message || 'Ошибка');
      setTimeout(() => setWsError(''), 3500);
    };
    socket.on('error', onError);
    return () => socket.off('error', onError);
  }, []);

  function sendTyping() {
    if (typingTimeout.current) return;
    socket.send({ type: 'typing', channel_id: activeChannelId, dm_to: activeDmUid });
    typingTimeout.current = setTimeout(() => { typingTimeout.current = null; }, 2500);
  }

  async function getSharedKey(partnerId: string): Promise<CryptoKey|null> {
    const cached = getCachedKey(partnerId);
    if (cached) return cached;
    try {
      const { public_key } = await fetch(`/api/users/${partnerId}/public_key`).then(r => r.json());
      if (!public_key) return null;
      const kp = (window as any).__e2eKeyPair; if (!kp) return null;
      const remoteKey = await importPublicKey(public_key);
      const sharedKey = await deriveSharedKey(kp.privateKey, remoteKey);
      setCachedKey(partnerId, sharedKey); return sharedKey;
    } catch { return null; }
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed && !uploadPreview) return;
    if (!me || newsBlocked) return;

    let payload: any = {
      reply_to: replyTo ? { id: replyTo.id, uid: replyTo.uid || replyTo.from_uid, text: replyTo.text } : undefined,
    };
    if (uploadPreview) payload.file = uploadPreview;

    if (activeDmUid) {
      payload.type = 'dm'; payload.to = activeDmUid;
      if (trimmed) {
        const key = await getSharedKey(activeDmUid);
        if (key) { payload.text = await encryptMessage(trimmed, key); payload.encrypted = true; }
        else payload.text = trimmed;
      }
    } else if (activeChannelId) {
      payload.type = 'channel_msg'; payload.channel_id = activeChannelId; payload.text = trimmed;
    } else return;

    socket.send(payload);
    setText(''); setUploadPreview(null); setReplyTo(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const data = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json());
      setUploadPreview(data);
    } catch { alert('Upload error'); }
    setUploading(false); e.target.value = '';
  }

  function sendSticker(sticker: any) {
    if (!me || newsBlocked) return;
    socket.send({
      type: activeDmUid ? 'dm' : 'channel_msg',
      ...(activeDmUid ? { to: activeDmUid } : { channel_id: activeChannelId }),
      sticker,
    });
    setShowSticker(false);
  }

  async function sendPoll(question: string, options: string[]) {
    const poll = await fetch('/api/polls', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, options }),
    }).then(r => r.json());
    socket.send({ type: 'channel_msg', channel_id: activeChannelId, text: question, poll_id: poll.id });
    setShowPoll(false);
  }

  const disabled    = !activeChannelId && !activeDmUid;
  const placeholder = newsBlocked
    ? '📢 Только модераторы могут писать здесь'
    : activeDmUid ? t('dm_message')
    : activeChannelId ? (isNewsChannel ? '📢 Новостной канал' : t('message'))
    : t('select_channel');

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {/* Popovers */}
      {showEmoji && (
        <div className="popover" style={{ bottom: '100%', left: 16, marginBottom: 8 }}>
          <EmojiPickerPopover onPick={e => { setText(tx => tx + e); setShowEmoji(false); }} onClose={() => setShowEmoji(false)} />
        </div>
      )}
      {showSticker && (
        <div className="popover" style={{ bottom: '100%', left: 56, marginBottom: 8, width: 320 }}>
          <StickerPicker serverStickers={serverStickers} onPick={sendSticker} onClose={() => setShowSticker(false)} />
        </div>
      )}
      {showPoll && <PollModal onSubmit={sendPoll} onClose={() => setShowPoll(false)} />}

      {/* WS error toast */}
      {wsError && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 8, padding: '8px 16px', borderRadius: 8, fontSize: 13,
          background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.4)',
          color: 'var(--red)', display: 'flex', gap: 7, alignItems: 'center',
          whiteSpace: 'nowrap', zIndex: 20,
        }}>
          <span className="ms ms-sm">error</span>{wsError}
        </div>
      )}

      {/* Reply bar */}
      {replyTo && (
        <div className="reply-bar">
          <div style={{ width: 3, alignSelf: 'stretch', background: 'var(--accent)', borderRadius: 3, flexShrink: 0 }} />
          <span style={{ flex: 1 }}>Ответ: <b style={{ color: 'var(--text)' }}>{replyTo.text?.slice(0, 60)}</b></span>
          <button className="icon-btn" onClick={() => setReplyTo(null)}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>
      )}

      {/* Upload preview */}
      {uploadPreview && (
        <div className="upload-preview">
          {uploadPreview.type === 'image'
            ? <img src={`http://localhost:8000${uploadPreview.url}`} alt=""
                style={{ height: 60, borderRadius: 8, objectFit: 'cover' }} />
            : <div className="file-preview" style={{ flex: 1 }}>
                <div className="file-icon"><span className="ms">description</span></div>
                <div><div style={{ fontSize: 13, fontWeight: 600 }}>{uploadPreview.name}</div></div>
              </div>
          }
          <button className="icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setUploadPreview(null)}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>
      )}

      {/* News channel notice */}
      {isNewsChannel && (
        <div style={{
          padding: '6px 20px', fontSize: 12, color: 'var(--text-3)',
          background: 'var(--accent-subtle)', borderTop: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span className="ms ms-sm filled" style={{ color: 'var(--accent-2)' }}>campaign</span>
          {newsBlocked
            ? 'Только модераторы и администраторы могут публиковать в этом канале'
            : 'Новостной канал — ваши сообщения увидят все участники'
          }
        </div>
      )}

      {/* Input area */}
      <div className="input-area">
        <div className="input-pill" style={{ opacity: newsBlocked ? 0.5 : 1 }}>
          <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFile} />
          <button className="icon-btn" title={t('attach')} disabled={disabled || newsBlocked}
            onClick={() => fileRef.current?.click()}>
            <span className="ms ms-sm">attach_file</span>
          </button>
          {!activeDmUid && activeChannelId && !newsBlocked && (
            <button className="icon-btn" title={t('polls')} disabled={disabled}
              onClick={() => { setShowPoll(true); setShowEmoji(false); setShowSticker(false); }}>
              <span className="ms ms-sm">bar_chart</span>
            </button>
          )}
          <button className={`icon-btn${showSticker ? ' active' : ''}`} title={t('stickers')}
            disabled={disabled || newsBlocked}
            onClick={() => { setShowSticker(s => !s); setShowEmoji(false); }}>
            <span className={`ms ms-sm${showSticker ? ' filled' : ''}`}>emoji_emotions</span>
          </button>

          <div style={{ width: 1, height: 22, background: 'var(--divider)', flexShrink: 0 }} />

          <input
            value={text}
            onChange={e => { setText(e.target.value); if (!newsBlocked) sendTyping(); }}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={placeholder}
            disabled={disabled || newsBlocked}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 15, padding: '5px 2px', fontFamily: 'inherit',
              cursor: newsBlocked ? 'not-allowed' : 'text',
            }}
            autoComplete="off"
          />

          <div style={{ width: 1, height: 22, background: 'var(--divider)', flexShrink: 0 }} />

          <button className={`icon-btn${showEmoji ? ' active' : ''}`} title={t('emoji')}
            disabled={disabled || newsBlocked}
            onClick={() => { setShowEmoji(s => !s); setShowSticker(false); }}>
            <span className={`ms ms-sm${showEmoji ? ' filled' : ''}`}>sentiment_satisfied</span>
          </button>

          {text.trim() || uploadPreview ? (
            <button className="send-btn" onClick={send} disabled={newsBlocked} title={t('send')}>
              <span className="ms ms-sm">send</span>
            </button>
          ) : (
            <button className="icon-btn" disabled={disabled || newsBlocked}>
              <span className="ms ms-sm">mic</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
