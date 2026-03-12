'use client';
import { useStore } from '../../lib/store';
import { voiceManager } from '../../lib/webrtc';

export default function VoiceBar() {
  const { voiceChannelId, setVoiceChannel, isMuted, isDeafened,
          toggleMute, toggleDeafen, servers, t } = useStore();
  if (!voiceChannelId) return null;

  let channelName = 'Voice';
  for (const s of servers) {
    const ch = s.channels.find(c => c.id === voiceChannelId);
    if (ch) { channelName = ch.name; break; }
  }

  function leave() { voiceManager.leave(); setVoiceChannel(null); }
  function handleMute() { toggleMute(); voiceManager.setMuted(!isMuted); }

  return (
    <div className="voice-bar-bottom" style={{
      position: 'fixed', bottom: 0, left: 72 + 240, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Animated wave bars */}
      <div className="voice-wave">
        {[0, 1, 2, 3, 4].map(i => <span key={i} />)}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isMuted ? 'var(--red)' : 'var(--green)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="ms ms-sm filled">{isMuted ? 'mic_off' : 'spatial_audio'}</span>
          {isMuted ? 'Заглушён' : t('joined_voice')}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 4, alignItems: 'center', marginTop: 1 }}>
          <span className="ms ms-sm">volume_up</span>
          {channelName}
        </div>
      </div>

      <button className="icon-btn" title={t('mute')} onClick={handleMute}
        style={{ color: isMuted ? 'var(--red)' : undefined }}>
        <span className="ms ms-sm filled">{isMuted ? 'mic_off' : 'mic'}</span>
      </button>

      <button className="icon-btn" title={t('deafen')} onClick={toggleDeafen}
        style={{ color: isDeafened ? 'var(--red)' : undefined }}>
        <span className="ms ms-sm filled">{isDeafened ? 'headset_off' : 'headset'}</span>
      </button>

      <button className="btn btn-danger btn-sm" style={{ padding: '5px 14px' }} onClick={leave}>
        <span className="ms ms-sm">call_end</span>
        {t('disconnect')}
      </button>
    </div>
  );
}
