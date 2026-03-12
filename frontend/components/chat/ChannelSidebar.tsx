'use client';
import { useStore } from '../../lib/store';
import { voiceManager } from '../../lib/webrtc';
import { ServerIcon } from './ServerSidebar';

export default function ChannelSidebar() {
  const {
    servers, activeServerId, activeChannelId, setActiveChannel,
    activeDmUid, setActiveDm, users, me, voiceChannelId, setVoiceChannel,
    setMessages, setDmMessages, setShowSettings, setShowServerSettings,
    setShowInvite, speakingUsers, isMuted, isDeafened, toggleMute, toggleDeafen,
    t, logout,
  } = useStore();

  const activeServer = servers.find(s => s.id === activeServerId);
  const otherUsers   = users.filter(u => u.id !== me?.id);

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
    if (!me) return;
    const msgs = await fetch(`/api/dm/${me.id}/${uid}`).then(r => r.json());
    const key  = [me.id, uid].sort().join('__');
    setDmMessages(key, msgs);
  }

  /* ── DM / Home view ─────────────────────────────────────────── */
  if (!activeServerId) {
    return (
      <div className="sidebar-channels">
        {/* Search bar */}
        <div style={{ padding: '12px 10px 8px', display: 'flex', gap: 8 }}>
          <button
            onClick={() => useStore.setState({ searchQuery: '' })}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--bg-3)', borderRadius: 8, padding: '7px 11px',
              fontSize: 13, color: 'var(--text-3)', cursor: 'pointer',
              border: 'none', fontFamily: 'inherit',
            }}>
            <span className="ms ms-sm">search</span>
            <span>{t('search_users')}</span>
          </button>
        </div>

        <div style={{
          padding: '4px 14px 6px', fontSize: 11, fontWeight: 700,
          color: 'var(--text-3)', letterSpacing: '.08em', textTransform: 'uppercase',
        }}>
          {t('members')}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 6px' }}>
          {otherUsers.map(u => (
            <div key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px',
                borderRadius: 8, cursor: 'pointer', transition: 'background .12s',
                background: activeDmUid === u.id ? 'var(--active)' : 'transparent',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = activeDmUid === u.id ? 'var(--active)' : 'var(--hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = activeDmUid === u.id ? 'var(--active)' : 'transparent')}
              onClick={() => openDm(u.id)}>
              <div className="avatar av-md" style={{ background: u.color, position: 'relative' }}>
                {u.letter}
                {u.online && <div className="online-dot" />}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {u.name}
                </div>
                <div style={{ fontSize: 11, color: u.online ? 'var(--green)' : 'var(--text-3)' }}>
                  {u.online ? t('online') : t('offline')}
                </div>
              </div>
            </div>
          ))}

          {otherUsers.length === 0 && (
            <div style={{ padding: '32px 14px', color: 'var(--text-3)', fontSize: 13, textAlign: 'center' }}>
              <span className="ms" style={{ fontSize: 40, opacity: .4, display: 'block', marginBottom: 8 }}>group_add</span>
              Зарегистрируйся с другом!
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

  if (!activeServer) return null;
  const textChannels  = activeServer.channels.filter(c => c.type === 'text');
  const voiceChannels = activeServer.channels.filter(c => c.type === 'voice');
  const newsChannels  = activeServer.channels.filter(c => c.type === 'news');

  return (
    <div className="sidebar-channels">
      {/* Server header */}
      <div style={{
        padding: '12px 14px', borderBottom: '1px solid var(--divider)',
        display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, cursor: 'pointer',
      }} onClick={() => setShowServerSettings(activeServerId)}>
        <ServerIcon server={activeServer} size={26} borderRadius={6} />
        <span style={{ fontSize: 15, fontWeight: 700, flex: 1, color: 'var(--text)' }}>{activeServer.name}</span>
        <button className="icon-btn" title={t('server_settings')}
          onClick={e => { e.stopPropagation(); setShowServerSettings(activeServerId); }}>
          <span className="ms ms-sm">keyboard_arrow_down</span>
        </button>
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

        {/* Announcements */}
        {newsChannels.length > 0 && (
          <>
            <SectionLabel icon="campaign" label="Новости" onAdd={() => setShowServerSettings(activeServerId)} />
            {newsChannels.map(ch => (
              <ChannelRow key={ch.id} ch={ch} active={activeChannelId === ch.id}
                icon="campaign" onClick={() => openChannel(ch)} />
            ))}
          </>
        )}

        {/* Text channels */}
        <SectionLabel icon="tag" label={t('text_channels')} onAdd={() => setShowServerSettings(activeServerId)} />
        {textChannels.map(ch => (
          <ChannelRow key={ch.id} ch={ch} active={activeChannelId === ch.id}
            icon="tag" onClick={() => openChannel(ch)} />
        ))}

        {/* Voice channels */}
        <SectionLabel icon="volume_up" label={t('voice_channels')} onAdd={() => setShowServerSettings(activeServerId)} style={{ marginTop: 8 }} />
        {voiceChannels.map(ch => {
          const members = useStore.getState().voiceMembers[ch.id] || [];
          const inThis  = voiceChannelId === ch.id;
          return (
            <div key={ch.id} className="voice-channel-item">
              <div className={`voice-channel-header${inThis ? ' active' : ''}`} onClick={() => joinVoice(ch)}>
                <span className="ms ch-icon" style={{ color: inThis ? 'var(--green)' : undefined }}>
                  {inThis ? 'sensors' : 'volume_up'}
                </span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{ch.name}</span>
                {members.length > 0 && (
                  <span style={{
                    fontSize: 11, color: 'var(--text-3)', background: 'var(--hover)',
                    padding: '1px 6px', borderRadius: 20,
                  }}>{members.length}</span>
                )}
              </div>
              {members.map(uid => {
                const u         = users.find(u => u.id === uid);
                if (!u) return null;
                const isSpeaking = speakingUsers.has(uid);
                return (
                  <div key={uid} className={`voice-member-row${isSpeaking ? ' speaking' : ''}`}>
                    <div className={`avatar av-sm${isSpeaking ? ' voice-speaking-ring' : ''}`}
                      style={{ background: u.color }}>
                      {u.letter}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>{u.name}</span>
                    {uid === me?.id && isMuted && (
                      <span className="ms ms-sm filled" style={{ color: 'var(--red)' }}>mic_off</span>
                    )}
                    {isSpeaking && (
                      <span className="ms ms-sm filled" style={{ color: 'var(--green)' }}>graphic_eq</span>
                    )}
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

/* ── Sub-components ─────────────────────────────────────────────── */

function SectionLabel({ icon, label, onAdd, style }: any) {
  return (
    <div className="ch-section-label" style={style}>
      <span className="ms ms-sm" style={{ marginRight: 4 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      <button className="icon-btn" style={{ marginLeft: 'auto', width: 22, height: 22 }} onClick={onAdd}>
        <span className="ms" style={{ fontSize: 16 }}>add</span>
      </button>
    </div>
  );
}

function ChannelRow({ ch, active, icon, onClick }: any) {
  return (
    <div className={`channel-item${active ? ' active' : ''}`} onClick={onClick}>
      <span className="ms ch-icon">{icon}</span>
      <span style={{ flex: 1 }}>{ch.name}</span>
    </div>
  );
}

function SelfStrip({ me, isMuted, isDeafened, toggleMute, toggleDeafen, onSettings, onLogout, t }: any) {
  const { voiceChannelId } = useStore();
  if (!me) return null;
  return (
    <div style={{
      padding: '8px 10px', borderTop: '1px solid var(--divider)',
      display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
      background: voiceChannelId ? 'rgba(74,222,128,0.06)' : 'rgba(0,0,0,0.1)',
    }}>
      <div className="avatar av-sm" style={{ background: me.color, cursor: 'pointer' }} onClick={onSettings}>
        {me.letter}
        <div className="online-dot" />
      </div>
      <div style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }} onClick={onSettings}>
        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
          {me.name}
        </div>
        <div style={{ fontSize: 11, color: voiceChannelId ? 'var(--green)' : 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 3 }}>
          {voiceChannelId
            ? <><span className="ms" style={{ fontSize: 12 }}>graphic_eq</span>{t('joined_voice')}</>
            : <><span className="ms" style={{ fontSize: 11 }}>circle</span>{t('online')}</>}
        </div>
      </div>
      {voiceChannelId && (
        <button className="icon-btn" title={t('mute')} onClick={toggleMute}
          style={{ color: isMuted ? 'var(--red)' : undefined }}>
          <span className="ms ms-sm filled">{isMuted ? 'mic_off' : 'mic'}</span>
        </button>
      )}
      {voiceChannelId && (
        <button className="icon-btn" title={t('deafen')} onClick={toggleDeafen}
          style={{ color: isDeafened ? 'var(--red)' : undefined }}>
          <span className="ms ms-sm filled">{isDeafened ? 'headset_off' : 'headset'}</span>
        </button>
      )}
      <button className="icon-btn" title={t('settings')} onClick={onSettings}>
        <span className="ms ms-sm">settings</span>
      </button>
    </div>
  );
}
