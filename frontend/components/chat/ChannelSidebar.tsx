'use client';
import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { voiceManager } from '../../lib/webrtc';
import { ServerIcon } from './ServerSidebar';

export default function ChannelSidebar({ mobileSidebarOpen }: { mobileSidebarOpen?: boolean }) {
  const {
    servers, activeServerId, activeChannelId, setActiveChannel,
    activeDmUid, setActiveDm, users, me, voiceChannelId, setVoiceChannel,
    setMessages, setDmMessages, setShowSettings, setShowServerSettings,
    setShowInvite, speakingUsers, isMuted, isDeafened, toggleMute, toggleDeafen,
    t, logout, dmContacts, addDmContact, removeDmContact, dmUnread, clearDmUnread,
  } = useStore();

  const [showAddDm,  setShowAddDm]  = useState(false);
  const [searchQ,    setSearchQ]    = useState('');
  const [searchRes,  setSearchRes]  = useState<any[]>([]);
  const [searching,  setSearching]  = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout>>();

  const activeServer = servers.find(s => s.id === activeServerId);

  // Search users for DM add
  useEffect(() => {
    if (!showAddDm) { setSearchQ(''); setSearchRes([]); return; }
    if (!searchQ.trim()) { setSearchRes([]); return; }
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/users?q=${encodeURIComponent(searchQ)}`).then(r => r.json());
        setSearchRes((res || []).filter((u: any) => u.id !== me?.id));
      } catch {}
      setSearching(false);
    }, 300);
  }, [searchQ, showAddDm]);

  async function openChannel(ch: any) {
    setActiveChannel(ch.id);
    const msgs = await fetch(`/api/channels/${ch.id}/messages`).then(r => r.json());
    setMessages(ch.id, msgs);
  }

  async function joinVoice(ch: any) {
    if (voiceChannelId === ch.id) {
      voiceManager.leave(); setVoiceChannel(null);
    } else {
      if (voiceChannelId) voiceManager.leave();
      setVoiceChannel(ch.id);
      const { voiceMembers } = useStore.getState();
      await voiceManager.join(ch.id, me!.id, voiceMembers[ch.id] || []);
    }
  }

  async function openDm(uid: string) {
    setActiveDm(uid);
    clearDmUnread(uid);
    if (!me) return;
    const msgs = await fetch(`/api/dm/${me.id}/${uid}`).then(r => r.json());
    const key  = [me.id, uid].sort().join('__');
    setDmMessages(key, msgs);
    // Close mobile sidebar after selecting
    useStore.setState({ mobileSidebarOpen: false });
  }

  async function addContact(user: any) {
    if (!me) return;
    await fetch(`/api/dm_contacts/${me.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact_uid: user.id }),
    });
    addDmContact(user);
    setShowAddDm(false);
  }

  /* ── DM / Home view ─────────────────────────────────────────── */
  if (!activeServerId) {
    return (
      <div className={`sidebar-channels${mobileSidebarOpen ? " mobile-open" : ""}`}>
        {/* Header */}
        <div style={{
          padding: '12px 10px 8px', borderBottom: '1px solid var(--divider)',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: 7,
            background: 'var(--bg-3)', borderRadius: 8, padding: '6px 10px',
            fontSize: 13, color: 'var(--text-3)',
          }}>
            <span className="ms ms-sm">chat_bubble</span>
            <span style={{ fontWeight: 600 }}>Личные сообщения</span>
          </div>
          <button className="icon-btn" title="Новый диалог" onClick={() => setShowAddDm(s => !s)}
            style={{ color: showAddDm ? 'var(--accent-2)' : 'var(--text-3)' }}>
            <span className="ms ms-sm">edit_square</span>
          </button>
        </div>

        {/* Add DM search */}
        {showAddDm && (
          <div style={{
            padding: '8px 8px 4px', borderBottom: '1px solid var(--divider)',
            background: 'var(--bg-2)',
          }}>
            <div style={{
              display: 'flex', gap: 7, alignItems: 'center',
              background: 'var(--bg-3)', borderRadius: 8, padding: '7px 10px',
              border: '1px solid var(--glass-border)',
            }}>
              <span className="ms ms-sm" style={{ color: 'var(--accent-2)' }}>person_search</span>
              <input
                autoFocus value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Найти пользователя..."
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'var(--text)', fontSize: 13, fontFamily: 'inherit',
                }}
              />
              {searching && <span className="ms ms-sm" style={{ color: 'var(--text-3)', animation: 'spin .8s linear infinite' }}>refresh</span>}
            </div>

            <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 4 }}>
              {searchRes.map(u => (
                <div key={u.id}
                  onClick={() => addContact(u)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    padding: '7px 8px', borderRadius: 8, cursor: 'pointer',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="avatar av-sm" style={{ background: u.color }}>
                    {u.avatar_url
                      ? <img src={`http://localhost:8000${u.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                      : u.letter}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{u.name}</span>
                  <span className="ms ms-sm" style={{ marginLeft: 'auto', color: 'var(--accent-2)' }}>add</span>
                </div>
              ))}
              {searchQ && !searching && searchRes.length === 0 && (
                <div style={{ padding: '12px 8px', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                  Никого не нашли
                </div>
              )}
              {!searchQ && (
                <div style={{ padding: '10px 8px', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
                  Введите имя пользователя
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{
          padding: '8px 14px 4px', fontSize: 11, fontWeight: 700,
          color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          Диалоги
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 6px' }}>
          {dmContacts.map(u => {
            const unread = dmUnread[u.id] || 0;
            const fresh = users.find(x => x.id === u.id) || u;
            return (
              <div key={u.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                  borderRadius: 8, cursor: 'pointer', transition: 'background .12s',
                  background: activeDmUid === u.id ? 'var(--active)' : 'transparent',
                  position: 'relative',
                }}
                onMouseEnter={e => { (e.currentTarget.style.background = activeDmUid === u.id ? 'var(--active)' : 'var(--hover)') }}
                onMouseLeave={e => { (e.currentTarget.style.background = activeDmUid === u.id ? 'var(--active)' : 'transparent') }}
                onClick={() => openDm(u.id)}
              >
                <div className="avatar av-md" style={{ background: fresh.color, position: 'relative', flexShrink: 0 }}>
                  {fresh.avatar_url
                    ? <img src={`http://localhost:8000${fresh.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                    : fresh.letter}
                  {fresh.online && <div className="online-dot" style={{ border: '2px solid var(--bg-2)' }} />}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: unread ? 'var(--text)' : 'var(--text-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fresh.name}
                  </div>
                  <div style={{ fontSize: 11, color: fresh.online ? 'var(--green)' : 'var(--text-3)' }}>
                    {fresh.online ? t('online') : t('offline')}
                  </div>
                </div>
                {unread > 0 && (
                  <div style={{
                    minWidth: 18, height: 18, background: 'var(--red)',
                    borderRadius: 9, fontSize: 11, fontWeight: 700, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0 5px', flexShrink: 0,
                  }}>
                    {unread > 99 ? '99+' : unread}
                  </div>
                )}
              </div>
            );
          })}

          {dmContacts.length === 0 && (
            <div style={{ padding: '32px 14px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
              <span className="ms" style={{ fontSize: 40, opacity: .4, display: 'block', marginBottom: 8 }}>chat_bubble_outline</span>
              Нажмите <b style={{ color: 'var(--accent-2)' }}>✏️</b> чтобы начать диалог
            </div>
          )}
        </div>

        <SelfStrip
          me={me} isMuted={isMuted} isDeafened={isDeafened}
          toggleMute={toggleMute} toggleDeafen={toggleDeafen}
          onSettings={() => setShowSettings(true)} onLogout={logout} t={t}
        />
      </div>
    );
  }

  /* ── Server view ─────────────────────────────────────────────── */
  if (!activeServer) return null;
  const textChannels  = activeServer.channels.filter(c => c.type === 'text');
  const voiceChannels = activeServer.channels.filter(c => c.type === 'voice');
  const newsChannels  = activeServer.channels.filter(c => c.type === 'news');

  const isOwner   = activeServer.owner_id === me?.id;
  const roleId    = me?.id ? activeServer.member_roles?.[me.id] : null;
  const myRole    = activeServer.roles?.find((r: any) => r.id === roleId);
  const myPerms: string[] = myRole?.permissions || activeServer.roles?.[0]?.permissions || ['read','send'];
  const canManage = isOwner || myPerms.includes('manage');

  return (
    <div className={`sidebar-channels${mobileSidebarOpen ? " mobile-open" : ""}`}>
      {/* Server header */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        cursor: canManage ? 'pointer' : 'default',
      }} onClick={() => canManage && setShowServerSettings(activeServerId)}>
        <ServerIcon server={activeServer} size={26} borderRadius={6} />
        <span style={{ fontSize: 15, fontWeight: 700, flex: 1, color: 'var(--text)' }}>{activeServer.name}</span>
        {canManage && (
          <button className="icon-btn" title={t('server_settings')}
            onClick={e => { e.stopPropagation(); setShowServerSettings(activeServerId); }}>
            <span className="ms ms-sm">keyboard_arrow_down</span>
          </button>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1, padding: '6px 0' }}>
        {/* Invite */}
        <div style={{ padding: '4px 10px', marginBottom: 4 }}>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'center', gap: 6 }}
            onClick={() => setShowInvite(activeServerId)}>
            <span className="ms ms-sm">person_add</span>
            {t('invite')}
          </button>
        </div>

        {/* News channels */}
        {newsChannels.length > 0 && (
          <>
            <SectionLabel icon="campaign" label="Новости" onAdd={canManage ? () => setShowServerSettings(activeServerId) : undefined} />
            {newsChannels.map(ch => (
              <ChannelRow key={ch.id} ch={ch} active={activeChannelId === ch.id}
                icon="campaign" onClick={() => openChannel(ch)} />
            ))}
          </>
        )}

        {/* Text channels */}
        <SectionLabel icon="tag" label={t('text_channels')} onAdd={canManage ? () => setShowServerSettings(activeServerId) : undefined} />
        {textChannels.map(ch => (
          <ChannelRow key={ch.id} ch={ch} active={activeChannelId === ch.id}
            icon="tag" onClick={() => openChannel(ch)} />
        ))}

        {/* Voice channels */}
        <SectionLabel icon="volume_up" label={t('voice_channels')} onAdd={canManage ? () => setShowServerSettings(activeServerId) : undefined} style={{ marginTop: 8 }} />
        {voiceChannels.map(ch => {
          const members = useStore.getState().voiceMembers[ch.id] || [];
          const isIn    = voiceChannelId === ch.id;
          return (
            <div key={ch.id}>
              <ChannelRow ch={ch} active={isIn} icon="volume_up" onClick={() => joinVoice(ch)} />
              {members.map((uid: string) => {
                const u = users.find(x => x.id === uid);
                if (!u) return null;
                const speaking = speakingUsers?.includes(uid);
                return (
                  <div key={uid} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '3px 12px 3px 40px', fontSize: 12, color: 'var(--text-3)',
                  }}>
                    <div className="avatar" style={{
                      width: 20, height: 20, borderRadius: '50%', background: u.color, fontSize: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      outline: speaking ? '2px solid var(--green)' : 'none',
                    }}>{u.letter}</div>
                    <span style={{ color: speaking ? 'var(--green)' : 'var(--text-2)' }}>{u.name}</span>
                    {speaking && <span className="ms" style={{ fontSize: 14, color: 'var(--green)' }}>mic</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <SelfStrip
        me={me} isMuted={isMuted} isDeafened={isDeafened}
        toggleMute={toggleMute} toggleDeafen={toggleDeafen}
        onSettings={() => setShowSettings(true)} onLogout={logout} t={t}
      />
    </div>
  );
}

function SectionLabel({ icon, label, onAdd, style }: any) {
  return (
    <div style={{
      padding: '8px 10px 4px', display: 'flex', alignItems: 'center',
      fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
      letterSpacing: '.08em', textTransform: 'uppercase', userSelect: 'none',
      ...style,
    }}>
      <span className="ms" style={{ fontSize: 13, marginRight: 5 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {onAdd && (
        <button className="icon-btn" style={{ opacity: .7 }} onClick={e => { e.stopPropagation(); onAdd(); }}>
          <span className="ms" style={{ fontSize: 16 }}>add</span>
        </button>
      )}
    </div>
  );
}

function ChannelRow({ ch, active, icon, onClick }: any) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { onClick(); useStore.setState({ mobileSidebarOpen: false }); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 18px',
        borderRadius: 6, margin: '1px 6px', cursor: 'pointer',
        background: active ? 'var(--active)' : hover ? 'var(--hover)' : 'transparent',
        color: active ? 'var(--text)' : 'var(--text-2)',
        transition: 'background .1s',
      }}
    >
      <span className="ms ms-sm">{icon}</span>
      <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, flex: 1 }}>{ch.name}</span>
    </div>
  );
}

function SelfStrip({ me, isMuted, isDeafened, toggleMute, toggleDeafen, onSettings, onLogout, t }: any) {
  if (!me) return null;
  const avatarUrl = me.avatar_url ? `http://localhost:8000${me.avatar_url}` : null;
  return (
    <div style={{
      padding: '8px 10px', borderTop: '1px solid var(--divider)',
      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      background: 'var(--bg-2)',
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', background: me.color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        overflow: 'hidden', cursor: 'pointer',
      }} onClick={onSettings}>
        {avatarUrl
          ? <img src={avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : me.letter}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }} onClick={onSettings}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{me.name}</div>
        <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', gap: 4, alignItems: 'center' }}>
          <span className="ms filled" style={{ fontSize: 9 }}>circle</span> онлайн
        </div>
      </div>
      <button className={`icon-btn${isMuted ? ' active' : ''}`} title={isMuted ? 'Включить микрофон' : 'Выкл. микрофон'} onClick={toggleMute} style={{ color: isMuted ? 'var(--red)' : 'var(--text-3)' }}>
        <span className="ms ms-sm">{isMuted ? 'mic_off' : 'mic'}</span>
      </button>
      <button className={`icon-btn${isDeafened ? ' active' : ''}`} title={isDeafened ? 'Включить звук' : 'Выкл. звук'} onClick={toggleDeafen} style={{ color: isDeafened ? 'var(--red)' : 'var(--text-3)' }}>
        <span className="ms ms-sm">{isDeafened ? 'headset_off' : 'headphones'}</span>
      </button>
      <button className="icon-btn" title="Настройки" onClick={onSettings}>
        <span className="ms ms-sm">settings</span>
      </button>
    </div>
  );
}
