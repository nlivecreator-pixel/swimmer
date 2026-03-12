'use client';
import { useRef, useState } from 'react';
import { useStore } from '../../lib/store';
import { socket } from '../../lib/socket';
import { encryptMessage, getCachedKey, deriveSharedKey, importPublicKey, setCachedKey } from '../../lib/crypto';
import EmojiPickerPopover from '../modals/EmojiPickerPopover';
import StickerPicker from '../modals/StickerPicker';
import PollModal from '../modals/PollModal';

export default function MessageInput() {
  const { activeChannelId, activeDmUid, me, replyTo, setReplyTo, t, servers, activeServerId } = useStore();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSticker, setShowSticker] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout>|null>(null);

  // Get server stickers + global stickers
  const activeSrv = servers.find(s => s.id === activeServerId);
  const serverStickers = activeSrv?.stickers || [];

  function sendTyping() {
    if (typingTimeout.current) return;
    socket.send({ type:'typing', channel_id:activeChannelId, dm_to:activeDmUid });
    typingTimeout.current = setTimeout(() => { typingTimeout.current=null; }, 2500);
  }

  async function getSharedKey(partnerId: string): Promise<CryptoKey|null> {
    const cached = getCachedKey(partnerId);
    if (cached) return cached;
    try {
      const {public_key} = await fetch(`/api/users/${partnerId}/public_key`).then(r=>r.json());
      if (!public_key) return null;
      const kp = (window as any).__e2eKeyPair;
      if (!kp) return null;
      const remoteKey = await importPublicKey(public_key);
      const sharedKey = await deriveSharedKey(kp.privateKey, remoteKey);
      setCachedKey(partnerId, sharedKey);
      return sharedKey;
    } catch { return null; }
  }

  async function send() {
    const trimmed = text.trim();
    if (!trimmed && !uploadPreview) return;
    if (!me) return;
    let payload: any = {
      reply_to: replyTo ? {id:replyTo.id,uid:replyTo.uid||replyTo.from_uid,text:replyTo.text} : undefined,
    };
    if (uploadPreview) payload.file = uploadPreview;
    if (activeDmUid) {
      payload.type = 'dm'; payload.to = activeDmUid;
      if (trimmed) {
        const key = await getSharedKey(activeDmUid);
        if (key) { payload.text = await encryptMessage(trimmed, key); payload.encrypted = true; }
        else { payload.text = trimmed; }
      }
    } else if (activeChannelId) {
      payload.type = 'channel_msg'; payload.channel_id = activeChannelId; payload.text = trimmed;
    } else return;
    socket.send(payload);
    setText(''); setUploadPreview(null); setReplyTo(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if(!file) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const data = await fetch('/api/upload',{method:'POST',body:fd}).then(r=>r.json());
      setUploadPreview(data);
    } catch { alert('Upload error'); }
    setUploading(false); e.target.value='';
  }

  function sendSticker(sticker: any) {
    if (!me) return;
    socket.send({ type: activeDmUid?'dm':'channel_msg',
      ...(activeDmUid?{to:activeDmUid}:{channel_id:activeChannelId}), sticker });
    setShowSticker(false);
  }

  async function sendPoll(question: string, options: string[]) {
    const poll = await fetch('/api/polls',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question,options})}).then(r=>r.json());
    socket.send({type:'channel_msg',channel_id:activeChannelId,text:question,poll_id:poll.id});
    setShowPoll(false);
  }

  const disabled = !activeChannelId && !activeDmUid;
  const placeholder = activeDmUid ? t('dm_message') : activeChannelId ? t('message') : t('select_channel');

  return (
    <div style={{position:'relative',flexShrink:0}}>
      {showEmoji && (
        <div className="popover" style={{bottom:'100%',left:16,marginBottom:8}}>
          <EmojiPickerPopover onPick={e=>{setText(tx=>tx+e);setShowEmoji(false);}} onClose={()=>setShowEmoji(false)} />
        </div>
      )}
      {showSticker && (
        <div className="popover" style={{bottom:'100%',left:56,marginBottom:8,width:320}}>
          <StickerPicker serverStickers={serverStickers} onPick={sendSticker} onClose={()=>setShowSticker(false)} />
        </div>
      )}
      {showPoll && <PollModal onSubmit={sendPoll} onClose={()=>setShowPoll(false)} />}

      {replyTo && (
        <div className="reply-bar">
          <div style={{width:3,alignSelf:'stretch',background:'var(--accent)',borderRadius:3,flexShrink:0}} />
          <span style={{flex:1}}>Ответ на: <b style={{color:'var(--text)'}}>{replyTo.text?.slice(0,60)}</b></span>
          <button className="icon-btn" style={{fontSize:14}} onClick={()=>setReplyTo(null)}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>
      )}
      {uploadPreview && (
        <div className="upload-preview">
          {uploadPreview.type==='image'
            ? <img src={`http://localhost:8000${uploadPreview.url}`} alt=""
                style={{height:60,borderRadius:8,objectFit:'cover'}} />
            : <div className="file-preview" style={{flex:1}}>
                <div className="file-icon"><span className="ms">description</span></div>
                <div><div style={{fontSize:13,fontWeight:600}}>{uploadPreview.name}</div></div>
              </div>
          }
          <button className="icon-btn" style={{marginLeft:'auto'}} onClick={()=>setUploadPreview(null)}>
            <span className="ms ms-sm">close</span>
          </button>
        </div>
      )}

      <div className="input-area">
        <div className="input-pill">
          <input ref={fileRef} type="file" style={{display:'none'}} onChange={handleFile} />
          <button className="icon-btn" title={t('attach')} disabled={disabled} onClick={()=>fileRef.current?.click()}>
            <span className="ms ms-sm">attach_file</span>
          </button>
          {!activeDmUid && activeChannelId && (
            <button className="icon-btn" title={t('polls')} disabled={disabled}
              onClick={()=>{setShowPoll(true);setShowEmoji(false);setShowSticker(false);}}>
              <span className="ms ms-sm">bar_chart</span>
            </button>
          )}
          <button className={`icon-btn${showSticker?' active':''}`} title={t('stickers')} disabled={disabled}
            onClick={()=>{setShowSticker(s=>!s);setShowEmoji(false);}}>
            <span className={`ms ms-sm${showSticker?' filled':''}`}>emoji_emotions</span>
          </button>

          <div style={{width:1,height:22,background:'var(--divider)',flexShrink:0}} />

          <input
            value={text} onChange={e=>{setText(e.target.value);sendTyping();}}
            onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&send()}
            placeholder={placeholder} disabled={disabled}
            style={{flex:1,background:'transparent',border:'none',outline:'none',
                   color:'var(--text)',fontSize:15,padding:'5px 2px',fontFamily:'inherit'}}
            autoComplete="off"
          />

          <div style={{width:1,height:22,background:'var(--divider)',flexShrink:0}} />

          <button className={`icon-btn${showEmoji?' active':''}`} title={t('emoji')} disabled={disabled}
            onClick={()=>{setShowEmoji(s=>!s);setShowSticker(false);}}>
            <span className={`ms ms-sm${showEmoji?' filled':''}`}>sentiment_satisfied</span>
          </button>

          {text.trim()||uploadPreview ? (
            <button className="send-btn" onClick={send} title={t('send')}>
              <span className="ms ms-sm">send</span>
            </button>
          ) : (
            <button className="icon-btn" disabled={disabled}>
              <span className="ms ms-sm">mic</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
