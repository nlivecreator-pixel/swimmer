import { create } from 'zustand';
import { socket } from './socket';

export type Theme = 'dark' | 'light';
export type Lang  = 'ru' | 'en';

export const T: Record<Lang, Record<string, string>> = {
  ru: {
    online:'онлайн',offline:'не в сети',channels:'Каналы',voice_channels:'Голосовые',
    text_channels:'Текстовые',members:'Участники',settings:'Настройки',logout:'Выйти',
    send:'Отправить',message:'Сообщение...',dm_message:'Написать в DM...',attach:'Прикрепить',
    stickers:'Стикеры',polls:'Опрос',emoji:'Эмодзи',search:'Поиск',invite:'Пригласить',
    create_server:'Создать сервер',server_settings:'Настройки сервера',profile:'Профиль',
    appearance:'Внешний вид',language:'Язык',voice_video:'Голос и видео',about_me:'О себе',
    save:'Сохранить',cancel:'Отмена',dark_theme:'Тёмная',light_theme:'Светлая',
    roles:'Роли',server_stickers:'Стикеры сервера',channels_settings:'Каналы',
    server_info:'Информация',server_name:'Название сервера',server_desc:'Описание',
    add_channel:'Добавить канал',add_role:'Добавить роль',add_sticker:'Добавить стикер',
    copy_link:'Скопировать ссылку',invite_link:'Ссылка-приглашение',joined_voice:'Подключён к голосу',
    mute:'Заглушить',deafen:'Выкл. звук',disconnect:'Отключиться',
    no_messages:'Начни разговор!',select_channel:'Выберите канал',
    news_channel:'Новостной',voice_channel:'Голосовой',text_channel:'Текстовый',
    my_account:'Мой аккаунт',edit_profile:'Редактировать профиль',change_avatar:'Сменить аватар',
    bio_placeholder:'Расскажи о себе...',connected:'Подключено',disconnected:'Отключено',
    server_members:'Участники сервера',kick:'Выгнать',ban:'Заблокировать',
    channel_name:'Название канала',channel_topic:'Тема канала',role_name:'Название роли',
    role_color:'Цвет роли',sticker_emoji:'Эмодзи',sticker_name:'Название',
    delete_channel:'Удалить канал',delete_sticker:'Удалить',
    join_server:'Войти на сервер',invite_valid:'Действительное приглашение',
    copied:'Скопировано!',search_users:'Поиск по @username',
    no_results:'Ничего не найдено',dm_open:'Написать',
    username_placeholder:'@имя пользователя',server_image:'Фото сервера',
    upload_server_image:'Загрузить фото',
  },
  en: {
    online:'online',offline:'offline',channels:'Channels',voice_channels:'Voice Channels',
    text_channels:'Text Channels',members:'Members',settings:'Settings',logout:'Log out',
    send:'Send',message:'Message...',dm_message:'Message DM...',attach:'Attach',
    stickers:'Stickers',polls:'Poll',emoji:'Emoji',search:'Search',invite:'Invite',
    create_server:'Create Server',server_settings:'Server Settings',profile:'Profile',
    appearance:'Appearance',language:'Language',voice_video:'Voice & Video',about_me:'About Me',
    save:'Save',cancel:'Cancel',dark_theme:'Dark',light_theme:'Light',
    roles:'Roles',server_stickers:'Server Stickers',channels_settings:'Channels',
    server_info:'Overview',server_name:'Server Name',server_desc:'Description',
    add_channel:'Add Channel',add_role:'Add Role',add_sticker:'Add Sticker',
    copy_link:'Copy Link',invite_link:'Invite Link',joined_voice:'Connected to voice',
    mute:'Mute',deafen:'Deafen',disconnect:'Disconnect',
    no_messages:'Start the conversation!',select_channel:'Select a channel',
    news_channel:'Announcement',voice_channel:'Voice',text_channel:'Text',
    my_account:'My Account',edit_profile:'Edit Profile',change_avatar:'Change Avatar',
    bio_placeholder:'Tell us about yourself...',connected:'Connected',disconnected:'Disconnected',
    server_members:'Server Members',kick:'Kick',ban:'Ban',
    channel_name:'Channel Name',channel_topic:'Channel Topic',role_name:'Role Name',
    role_color:'Role Color',sticker_emoji:'Emoji',sticker_name:'Name',
    delete_channel:'Delete Channel',delete_sticker:'Delete',
    join_server:'Join Server',invite_valid:'Valid Invite',
    copied:'Copied!',search_users:'Search @username',
    no_results:'No results found',dm_open:'Send Message',
    username_placeholder:'@username',server_image:'Server Photo',
    upload_server_image:'Upload Photo',
  },
};

export interface User {
  id:string; name:string; letter:string; color:string;
  online?:boolean; public_key?:string; bio?:string; avatar_url?:string;
}
export interface Channel {
  id:string; server_id:string; name:string; type:'text'|'voice'|'news'; topic?:string;
}
export interface Role {
  id:string; name:string; color:string; permissions:string[];
}
export interface Server {
  id:string; name:string; icon:string; image_url?:string; description?:string;
  channels:Channel[]; members:string[]; owner_id:string;
  roles:Role[]; member_roles:Record<string,string>;
  stickers:{id:string;emoji:string;name:string}[];
  invites:Record<string,any>;
}
export interface Message {
  id:string; uid?:string; from_uid?:string; to_uid?:string; channel_id?:string;
  text:string; encrypted?:boolean; ts:string; full_ts?:string;
  type:'text'|'image'|'file'|'sticker'|'poll';
  reactions:Record<string,string[]>;
  file?:{url:string;name:string;size:number;mime:string;type:string};
  sticker?:{id:string;emoji:string;name:string};
  poll_id?:string; poll?:Poll;
  reply_to?:{id:string;uid:string;text:string};
}
export interface Poll {
  id:string; question:string; options:{text:string;votes:string[]}[];
}

interface AppState {
  me: User|null;
  setMe:(u:User)=>void; updateMe:(u:Partial<User>)=>void; logout:()=>void;

  theme:Theme; setTheme:(t:Theme)=>void;
  lang:Lang;   setLang:(l:Lang)=>void;
  t:(key:string)=>string;

  servers:Server[]; activeServerId:string|null; activeChannelId:string|null;
  setServers:(s:Server[])=>void;
  updateServer:(s:Server)=>void;
  addServer:(s:Server)=>void;
  addMemberToServer:(serverId:string, user:User)=>void;
  setActiveServer:(id:string)=>void;
  setActiveChannel:(id:string|null)=>void;

  activeDmUid:string|null; setActiveDm:(uid:string|null)=>void;
  dmMessages:Record<string,Message[]>;
  addDmMessage:(key:string,msg:Message)=>void;
  setDmMessages:(key:string,msgs:Message[])=>void;

  messages:Record<string,Message[]>;
  addMessage:(cid:string,msg:Message)=>void;
  setMessages:(cid:string,msgs:Message[])=>void;
  updateReactions:(msgId:string,channelId:string|null,reactions:Record<string,string[]>,dmKey?:string)=>void;
  deleteMessage:(msgId:string,channelId:string|null)=>void;
  updatePoll:(poll:Poll)=>void;

  users:User[]; setUsers:(u:User[])=>void;
  setUserOnline:(uid:string,online:boolean)=>void;
  updateUser:(u:User)=>void;
  upsertUser:(u:User)=>void;

  voiceChannelId:string|null; voiceMembers:Record<string,string[]>;
  setVoiceChannel:(id:string|null)=>void;
  setVoiceMembers:(channelId:string,members:string[])=>void;
  isMuted:boolean; isDeafened:boolean;
  toggleMute:()=>void; toggleDeafen:()=>void;
  speakingUsers:Set<string>; setSpeaking:(uid:string,v:boolean)=>void;

  typingUsers:Record<string,string[]>;
  setTyping:(channelId:string,uid:string,isTyping:boolean)=>void;

  showUserPanel:boolean; toggleUserPanel:()=>void;
  replyTo:Message|null; setReplyTo:(m:Message|null)=>void;
  showSettings:boolean; setShowSettings:(v:boolean)=>void;
  showServerSettings:string|null; setShowServerSettings:(sid:string|null)=>void;
  showCreateServer:boolean; setShowCreateServer:(v:boolean)=>void;
  showInvite:string|null; setShowInvite:(sid:string|null)=>void;
  searchQuery:string; setSearchQuery:(q:string)=>void;

  dmContacts:User[]; setDmContacts:(u:User[])=>void;
  addDmContact:(u:User)=>void; removeDmContact:(uid:string)=>void;
  dmUnread:Record<string,number>;
  incDmUnread:(uid:string)=>void; clearDmUnread:(uid:string)=>void;
  mobileSidebarOpen:boolean; setMobileSidebarOpen:(v:boolean)=>void;
}

export const useStore = create<AppState>((set, get) => ({
  me: null,
  setMe: (u) => set({ me: u }),
  updateMe: (u) => set(s => ({ me: s.me ? { ...s.me, ...u } : s.me })),
  logout: () => {
    socket.disconnect();
    set({ me:null, activeChannelId:null, activeDmUid:null, voiceChannelId:null });
    if (typeof window !== 'undefined') localStorage.removeItem('swimer_me');
  },

  theme:'dark',
  setTheme: (t) => {
    set({ theme:t });
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('swimer_theme', t);
  },
  lang:'ru',
  setLang: (l) => { set({ lang:l }); localStorage.setItem('swimer_lang', l); },
  t: (key) => { const {lang} = get(); return T[lang]?.[key] ?? T.ru?.[key] ?? key; },

  servers:[], activeServerId:null, activeChannelId:null,
  setServers: (s) => set({ servers:s }),
  updateServer: (s) => set(st => ({ servers: st.servers.map(x => x.id===s.id ? {...x,...s} : x) })),
  addServer: (s) => set(st => {
    if (st.servers.find(x => x.id === s.id)) return {};
    return { servers: [...st.servers, s] };
  }),
  addMemberToServer: (serverId, user) => set(st => ({
    servers: st.servers.map(s =>
      s.id === serverId && !s.members.includes(user.id)
        ? { ...s, members: [...s.members, user.id] }
        : s
    ),
  })),
  setActiveServer: (id) => set({ activeServerId:id, activeChannelId:null, activeDmUid:null }),
  setActiveChannel: (id) => set({ activeChannelId:id, activeDmUid:null }),

  activeDmUid:null,
  setActiveDm: (uid) => set({ activeDmUid:uid, activeChannelId:null }),
  dmMessages:{},
  addDmMessage: (key, msg) => set(s => ({
    dmMessages: { ...s.dmMessages, [key]: [...(s.dmMessages[key]||[]), msg] }
  })),
  setDmMessages: (key, msgs) => set(s => ({ dmMessages: { ...s.dmMessages, [key]: msgs } })),

  messages:{},
  addMessage: (cid, msg) => set(s => ({
    messages: { ...s.messages, [cid]: [...(s.messages[cid]||[]), msg] }
  })),
  setMessages: (cid, msgs) => set(s => ({ messages: { ...s.messages, [cid]: msgs } })),
  updateReactions: (msgId, channelId, reactions, dmKey) => set(s => {
    if (channelId) {
      return { messages: { ...s.messages, [channelId]: (s.messages[channelId]||[]).map(m => m.id===msgId ? {...m,reactions} : m) } };
    }
    if (dmKey) {
      return { dmMessages: { ...s.dmMessages, [dmKey]: (s.dmMessages[dmKey]||[]).map(m => m.id===msgId ? {...m,reactions} : m) } };
    }
    // Fallback: search all DM threads
    const newDm = { ...s.dmMessages };
    for (const key in newDm) newDm[key] = newDm[key].map(m => m.id===msgId ? {...m,reactions} : m);
    return { dmMessages: newDm };
  }),
  deleteMessage: (msgId, channelId) => set(s => {
    if (channelId) return { messages: { ...s.messages, [channelId]: (s.messages[channelId]||[]).filter(m=>m.id!==msgId) } };
    return {};
  }),
  updatePoll: (poll) => set(s => {
    const newMsgs = { ...s.messages };
    for (const cid in newMsgs) newMsgs[cid] = newMsgs[cid].map(m => m.poll?.id===poll.id ? {...m,poll} : m);
    return { messages:newMsgs };
  }),

  users:[], setUsers: (u) => set({ users:u }),
  setUserOnline: (uid, online) => set(s => ({ users: s.users.map(u => u.id===uid ? {...u,online} : u) })),
  updateUser: (u) => set(s => ({
    users: s.users.find(x=>x.id===u.id)
      ? s.users.map(x => x.id===u.id ? {...x,...u} : x)
      : [...s.users, u],
    me: s.me?.id===u.id ? {...s.me,...u} : s.me,
  })),
  upsertUser: (u) => set(s => ({
    users: s.users.find(x=>x.id===u.id)
      ? s.users.map(x => x.id===u.id ? {...x,...u} : x)
      : [...s.users, u],
  })),

  voiceChannelId:null, voiceMembers:{},
  setVoiceChannel: (id) => set({ voiceChannelId:id }),
  setVoiceMembers: (channelId, members) => set(s => ({ voiceMembers: { ...s.voiceMembers, [channelId]:members } })),
  isMuted:false, isDeafened:false,
  toggleMute: () => set(s => ({ isMuted:!s.isMuted })),
  toggleDeafen: () => set(s => ({ isDeafened:!s.isDeafened })),
  speakingUsers: new Set(),
  setSpeaking: (uid, v) => set(s => {
    const next = new Set(s.speakingUsers);
    v ? next.add(uid) : next.delete(uid);
    return { speakingUsers:next };
  }),

  typingUsers:{},
  setTyping: (channelId, uid, isTyping) => set(s => {
    const cur  = s.typingUsers[channelId] || [];
    const next = isTyping ? [...new Set([...cur,uid])] : cur.filter(u=>u!==uid);
    return { typingUsers: { ...s.typingUsers, [channelId]:next } };
  }),

  showUserPanel:false,
  toggleUserPanel: () => set(s => ({ showUserPanel:!s.showUserPanel })),
  replyTo:null, setReplyTo:(m)=>set({replyTo:m}),
  showSettings:false, setShowSettings:(v)=>set({showSettings:v}),
  showServerSettings:null, setShowServerSettings:(sid)=>set({showServerSettings:sid}),
  showCreateServer:false, setShowCreateServer:(v)=>set({showCreateServer:v}),
  showInvite:null, setShowInvite:(sid)=>set({showInvite:sid}),
  searchQuery:'', setSearchQuery:(q)=>set({searchQuery:q}),

  dmContacts:[],
  setDmContacts:(u)=>set({dmContacts:u}),
  addDmContact:(u)=>set(s=>{
    if(s.dmContacts.find(x=>x.id===u.id)) return {};
    return {dmContacts:[...s.dmContacts,u]};
  }),
  removeDmContact:(uid)=>set(s=>({dmContacts:s.dmContacts.filter(x=>x.id!==uid)})),

  dmUnread:{},
  incDmUnread:(uid)=>set(s=>({dmUnread:{...s.dmUnread,[uid]:(s.dmUnread[uid]||0)+1}})),
  clearDmUnread:(uid)=>set(s=>({dmUnread:{...s.dmUnread,[uid]:0}})),
  mobileSidebarOpen:false, setMobileSidebarOpen:(v)=>set({mobileSidebarOpen:v}),
}));
