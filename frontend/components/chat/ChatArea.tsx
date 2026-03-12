'use client';
import { useStore } from '../../lib/store';
import MessageList from './MessageList';
import MessageInput from './MessageInput';

export default function ChatArea() {
  const {
    activeChannelId, activeDmUid, me, users, servers, typingUsers,
    toggleUserPanel, setShowInvite, setSearchQuery, t, activeServerId,
  } = useStore();

  const activeChannel = (() => {
    for (const s of servers) {
      const ch = s.channels.find(c => c.id === activeChannelId);
      if (ch) return ch;
    }
    return null;
  })();
  const dmPartner   = activeDmUid ? users.find(u => u.id === activeDmUid) : null;
  const name        = activeChannel ? activeChannel.name : dmPartner?.name ?? null;
  const typingList  = (typingUsers[activeChannelId || ''] || []).filter(uid => uid !== me?.id);
  const typingNames = typingList.map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
  const channelIcon = activeChannel?.type === 'voice' ? 'volume_up'
    : activeChannel?.type === 'news' ? 'campaign' : 'tag';

  if (!name) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 14, overflow: 'hidden', position: 'relative',
        background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(90,60,180,0.07) 0%, transparent 65%), linear-gradient(180deg, var(--bg-1) 0%, var(--bg-deep) 100%)',
      }}>
        <span className="ms" style={{
          fontSize: 80, color: 'var(--accent)', opacity: 0.15,
          fontVariationSettings: "'FILL' 1,'wght' 300,'GRAD' 0,'opsz' 48",
        }}>forum</span>
        <div style={{ color: 'var(--text-3)', fontSize: 17, fontWeight: 600 }}>
          {t('select_channel')}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {/* Watermark — fully contained, z-index 0, pointer-events none */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', userSelect: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <span className="ms" style={{
          fontSize: 280, color: 'var(--accent)', opacity: 0.028,
          fontVariationSettings: "'FILL' 1,'wght' 200,'GRAD' 0,'opsz' 48",
          lineHeight: 1,
        }}>water</span>
      </div>

      {/* Header */}
      <header className="chat-header" style={{ position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <div className="chat-header-pill">
          {dmPartner ? (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <UserAvatar user={dmPartner} size={40} />
              {dmPartner.online && (
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 11, height: 11, borderRadius: '50%',
                  background: 'var(--green)', border: '2px solid var(--bg-1)',
                }} />
              )}
            </div>
          ) : (
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span className="ms ms-lg">{channelIcon}</span>
            </div>
          )}

          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {dmPartner ? dmPartner.name : name}
            </div>
            <div style={{ fontSize: 11, color: dmPartner?.online ? 'var(--green)' : 'var(--text-3)' }}>
              {dmPartner
                ? (dmPartner.online ? t('online') : t('offline'))
                : activeChannel?.topic || activeChannel?.type}
            </div>
          </div>

          {dmPartner && (
            <div className="e2e-badge" style={{ marginLeft: 4 }}>
              <span className="ms ms-sm filled">lock</span>E2E
            </div>
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            <button className="icon-btn" title={t('search')} onClick={() => setSearchQuery('')}>
              <span className="ms ms-sm">search</span>
            </button>
            {activeServerId && (
              <button className="icon-btn" title={t('invite')} onClick={() => setShowInvite(activeServerId)}>
                <span className="ms ms-sm">person_add</span>
              </button>
            )}
            <button className="icon-btn" title={t('members')} onClick={toggleUserPanel}>
              <span className="ms ms-sm">group</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages + input — z-index 1 so it's above watermark */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <MessageList />

        {typingNames.length > 0 && (
          <div style={{
            padding: '0 24px 5px', fontSize: 12, color: 'var(--text-3)',
            display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
          }}>
            <div className="typing-dots">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
            <span><b style={{ color: 'var(--text-2)' }}>{typingNames.join(', ')}</b> печатает...</span>
          </div>
        )}

        <MessageInput />
      </div>
    </div>
  );
}

function UserAvatar({ user, size }: { user: any; size: number }) {
  if (user?.avatar_url) {
    return (
      <img src={`http://localhost:8000${user.avatar_url}`} alt={user.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: user.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: '#fff',
    }}>{user.letter}</div>
  );
}
