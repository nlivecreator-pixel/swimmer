'use client';
import { useEffect, useRef } from 'react';
import { useStore } from '../../lib/store';
import { socket } from '../../lib/socket';
import ServerSidebar from './ServerSidebar';
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
    addMemberToServer,
  } = useStore();

  const initialized = useRef(false);

  useEffect(() => {
    if (!me || initialized.current) return;
    initialized.current = true;

    socket.connect(me.id);

    // Load initial data via REST
    fetch('/api/servers').then(r => r.json()).then(setServers).catch(() => {});
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => {});

    // ── WebSocket event handlers ─────────────────────────────────

    // Snapshots (sent immediately on WS connect)
    const onUsersSnapshot = (msg: any) => {
      setUsers(msg.users || []);
    };
    const onServersSnapshot = (msg: any) => {
      if (msg.servers?.length) setServers(msg.servers);
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

    // Role update for self
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
      socket.off('member_joined',   onMemberJoined);
      socket.off('role_update',     onRoleUpdate);
      socket.off('typing',          onTyping);
      initialized.current = false;
    };
  }, [me?.id]);

  return (
    <div className="app-bg" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <ServerSidebar />
      <ChannelSidebar />
      <ChatArea />
      <UserPanel />
      <VoiceBar />
      {showSettings       && <SettingsModal />}
      {showServerSettings && <ServerSettingsModal sid={showServerSettings} />}
      {showCreateServer   && <CreateServerModal />}
      {showInvite         && <InviteModal sid={showInvite} />}
      {searchQuery !== null && searchQuery !== undefined && <SearchOverlay />}
    </div>
  );
}
