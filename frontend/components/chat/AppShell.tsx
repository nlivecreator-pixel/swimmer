'use client';
import { useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { socket } from '../../lib/socket';
import ServerSidebar from './ServerSidebar';
import { ServerIcon } from './ServerSidebar';
import ChannelSidebar from './ChannelSidebar';
import ChatArea from './ChatArea';
import UserPanel from './UserPanel';
import SettingsModal from '../modals/SettingsModal';
import ServerSettingsModal from '../modals/ServerSettingsModal';
import CreateServerModal from '../modals/CreateServerModal';
import InviteModal from '../modals/InviteModal';
import SearchOverlay from './SearchOverlay';
import VoiceBar from '../voice/VoiceBar';

export default function AppShell() {
  const {
    me, setServers, setUsers, setUserOnline, setVoiceMembers,
    updateReactions, addMessage, addDmMessage, deleteMessage, updatePoll,
    setTyping, updateServer, addServer, updateUser,
    showSettings, showServerSettings, showCreateServer, showInvite, searchQuery,
    addMemberToServer, setDmContacts, addDmContact, incDmUnread, activeDmUid,
  } = useStore();

  const initialized = useRef(false);

  useEffect(() => {
    if (!me || initialized.current) return;
    initialized.current = true;

    // If backend restarts and session is gone, auto-logout
    socket.setSessionExpiredCallback(() => {
      localStorage.removeItem('swimer_me');
      useStore.getState().logout();
    });

    socket.connect(me.id);

    // Load initial data via REST
    fetch(`/api/servers?uid=${me.id}`).then(r => r.json()).then(setServers).catch(() => {});
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => {});
    fetch(`/api/dm_contacts/${me.id}`).then(r => r.json()).then(setDmContacts).catch(() => {});

    // ── WebSocket event handlers ─────────────────────────────────

    // Snapshots (sent immediately on WS connect)
    const onUsersSnapshot = (msg: any) => {
      setUsers(msg.users || []);
    };
    const onServersSnapshot = (msg: any) => {
      // Only set servers that include this user
      if (msg.servers?.length) setServers(msg.servers.filter((s: any) => s.members?.includes(me.id)));
    };

    // Presence
    const onUserOnline  = (msg: any) => {
      setUserOnline(msg.uid, true);
      if (msg.user) updateUser(msg.user);
    };
    const onUserOffline = (msg: any) => {
      setUserOnline(msg.uid, false);
      if (msg.user) updateUser(msg.user);
    };

    // Profile updates (name, avatar, bio, color)
    const onUserUpdate = (msg: any) => {
      if (msg.user) updateUser(msg.user);
    };

    // Messages
    const onChannelMsg = (msg: any) => {
      if (msg.message?.channel_id) addMessage(msg.message.channel_id, msg.message);
    };
    const onDm = (msg: any) => {
      if (!msg.message) return;
      const key = [msg.message.from_uid, msg.message.to_uid].sort().join('__');
      addDmMessage(key, msg.message);
      // Increment unread if not currently viewing this DM
      const fromUid = msg.message.from_uid;
      if (fromUid !== me.id) {
        const { activeDmUid } = useStore.getState();
        if (activeDmUid !== fromUid) incDmUnread(fromUid);
      }
    };

    // Reactions (works for both channel and DM)
    const onReact = (msg: any) => {
      updateReactions(msg.message_id, msg.channel_id || null, msg.reactions, msg.dm_key);
    };

    const onDeleteMsg = (msg: any) => deleteMessage(msg.message_id, msg.channel_id);

    // Voice
    const onVoiceState = (msg: any) => setVoiceMembers(msg.channel_id, msg.members);

    // Polls
    const onPollUpdate = (msg: any) => updatePoll(msg.poll);

    // Server changes (settings, channels, roles, stickers, image)
    const onServerUpdate  = (msg: any) => { if (msg.server) updateServer(msg.server); };
    const onServerCreated = (msg: any) => { if (msg.server) addServer(msg.server); };

    // Member joined via invite link
    const onMemberJoined = (msg: any) => {
      if (msg.server) updateServer(msg.server);
      if (msg.user) updateUser(msg.user);
    };

    const onContactAdded = (msg: any) => {
      if (msg.user) addDmContact(msg.user);
    };

    const onRoleUpdate = (msg: any) => {
      // Refetch the server to get updated member_roles
      if (msg.server_id) {
        fetch(`/api/servers/${msg.server_id}`)
          .then(r => r.json())
          .then(updateServer)
          .catch(() => {});
      }
    };

    // Typing
    const onTyping = (msg: any) => {
      if (msg.uid === me.id) return;
      if (msg.channel_id) {
        setTyping(msg.channel_id, msg.uid, true);
        setTimeout(() => setTyping(msg.channel_id, msg.uid, false), 3000);
      }
    };

    socket.on('users_snapshot',  onUsersSnapshot);
    socket.on('servers_snapshot',onServersSnapshot);
    socket.on('user_online',     onUserOnline);
    socket.on('user_offline',    onUserOffline);
    socket.on('user_update',     onUserUpdate);
    socket.on('channel_msg',     onChannelMsg);
    socket.on('dm',              onDm);
    socket.on('react',           onReact);
    socket.on('delete_msg',      onDeleteMsg);
    socket.on('voice_state',     onVoiceState);
    socket.on('poll_update',     onPollUpdate);
    socket.on('server_update',   onServerUpdate);
    socket.on('server_created',  onServerCreated);
    socket.on('contact_added',   onContactAdded);
    socket.on('member_joined',   onMemberJoined);
    socket.on('role_update',     onRoleUpdate);
    socket.on('typing',          onTyping);

    return () => {
      socket.off('users_snapshot',  onUsersSnapshot);
      socket.off('servers_snapshot',onServersSnapshot);
      socket.off('user_online',     onUserOnline);
      socket.off('user_offline',    onUserOffline);
      socket.off('user_update',     onUserUpdate);
      socket.off('channel_msg',     onChannelMsg);
      socket.off('dm',              onDm);
      socket.off('react',           onReact);
      socket.off('delete_msg',      onDeleteMsg);
      socket.off('voice_state',     onVoiceState);
      socket.off('poll_update',     onPollUpdate);
      socket.off('server_update',   onServerUpdate);
      socket.off('server_created',  onServerCreated);
      socket.off('contact_added',   onContactAdded);
      socket.off('member_joined',   onMemberJoined);
      socket.off('role_update',     onRoleUpdate);
      socket.off('typing',          onTyping);
      initialized.current = false;
    };
  }, [me?.id]);

  const { mobileSidebarOpen, setMobileSidebarOpen, servers: storeServers, activeServerId, setActiveServer, dmUnread } = useStore();

  // Total unread DMs for nav badge
  const totalDmUnread = Object.values(dmUnread).reduce((a, b) => a + b, 0);

  return (
    <div className="app-bg" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile backdrop */}
      <div
        className={`mobile-backdrop${mobileSidebarOpen ? ' visible' : ''}`}
        onClick={() => setMobileSidebarOpen(false)}
      />

      <ServerSidebar />
      <ChannelSidebar mobileSidebarOpen={mobileSidebarOpen} />
      <ChatArea />
      <UserPanel />
      <VoiceBar />

      {/* Mobile bottom navigation bar */}
      <MobileNavBar
        me={me}
        servers={storeServers}
        activeServerId={activeServerId}
        setActiveServer={(sid: string) => { setActiveServer(sid); setMobileSidebarOpen(false); }}
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        totalDmUnread={totalDmUnread}
        setShowSettings={() => useStore.getState().setShowSettings(true)}
      />

      {showSettings       && <SettingsModal />}
      {showServerSettings && <ServerSettingsModal sid={showServerSettings} />}
      {showCreateServer   && <CreateServerModal />}
      {showInvite         && <InviteModal sid={showInvite} />}
      {searchQuery !== null && searchQuery !== undefined && <SearchOverlay />}
    </div>
  );
}

function MobileNavBar({ me, servers, activeServerId, setActiveServer, onToggleSidebar, totalDmUnread, setShowSettings }: any) {
  const { setMobileSidebarOpen } = useStore();
  return (
    <nav className="mobile-nav-bar">
      {/* DMs */}
      <MobileNavBtn
        icon="chat_bubble"
        active={!activeServerId}
        badge={totalDmUnread}
        onClick={() => { setActiveServer(''); setMobileSidebarOpen(true); }}
      />
      {/* Servers */}
      {servers.slice(0, 4).map((s: any) => (
        <MobileNavBtn
          key={s.id}
          icon={null}
          server={s}
          active={activeServerId === s.id}
          onClick={() => { setActiveServer(s.id); setMobileSidebarOpen(true); }}
        />
      ))}
      {/* Menu / channels */}
      <MobileNavBtn icon="menu" active={false} onClick={onToggleSidebar} />
      {/* Profile */}
      <div
        onClick={setShowSettings}
        style={{
          width: 36, height: 36, borderRadius: '50%', background: me?.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer',
          overflow: 'hidden', flexShrink: 0,
        }}
      >
        {me?.avatar_url
          ? <img src={`http://localhost:8000${me.avatar_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : me?.letter}
      </div>
    </nav>
  );
}

function MobileNavBtn({ icon, server, active, badge, onClick }: any) {
  return (
    <div onClick={onClick} style={{ position: 'relative', cursor: 'pointer' }}>
      <div style={{
        width: 40, height: 40, borderRadius: active ? 14 : '50%',
        background: active ? 'var(--accent)' : 'var(--bg-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-radius .2s, background .15s',
        overflow: 'hidden',
      }}>
        {server
          ? <ServerIcon server={server} size={40} borderRadius={active ? 14 : 20} />
          : <span className="ms ms-sm" style={{ color: active ? '#fff' : 'var(--text-3)' }}>{icon}</span>}
      </div>
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: -3, right: -3,
          minWidth: 16, height: 16, background: 'var(--red)',
          borderRadius: 8, fontSize: 10, fontWeight: 700, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '0 4px',
        }}>{badge > 99 ? '99+' : badge}</div>
      )}
    </div>
  );

}
