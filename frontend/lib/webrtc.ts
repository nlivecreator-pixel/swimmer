import { socket } from './socket';

type PeerMap = Map<string, RTCPeerConnection>;

class VoiceManager {
  private peers: PeerMap = new Map();
  private localStream: MediaStream | null = null;
  private channelId: string | null = null;
  private myUid: string | null = null;
  private isMuted = false;
  private remoteAudios: Map<string, HTMLAudioElement> = new Map();

  async join(channelId: string, uid: string, memberIds: string[]) {
    this.channelId = channelId;
    this.myUid = uid;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      console.warn('Mic access denied', e);
      return;
    }

    socket.send({ type: 'voice_join', channel_id: channelId });

    // Initiate connections to existing members
    for (const peerId of memberIds) {
      if (peerId !== uid) {
        await this.createOffer(peerId);
      }
    }

    this.setupSignaling();
  }

  private setupSignaling() {
    socket.on('rtc_offer', async (msg: any) => {
      if (!this.channelId) return;
      const pc = this.getOrCreatePeer(msg.from);
      await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: msg.sdp }));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.send({ type: 'rtc_answer', to: msg.from, sdp: answer.sdp });
    });

    socket.on('rtc_answer', async (msg: any) => {
      const pc = this.peers.get(msg.from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
    });

    socket.on('rtc_ice', async (msg: any) => {
      const pc = this.peers.get(msg.from);
      if (pc && msg.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(msg.candidate)); } catch {}
      }
    });
  }

  private async createOffer(peerId: string) {
    const pc = this.getOrCreatePeer(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.send({ type: 'rtc_offer', to: peerId, sdp: offer.sdp, channel_id: this.channelId });
  }

  private getOrCreatePeer(peerId: string): RTCPeerConnection {
    if (this.peers.has(peerId)) return this.peers.get(peerId)!;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    // Add local tracks
    this.localStream?.getTracks().forEach(t => pc.addTrack(t, this.localStream!));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.send({ type: 'rtc_ice', to: peerId, candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      const stream = e.streams[0];
      let audio = this.remoteAudios.get(peerId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        document.body.appendChild(audio);
        this.remoteAudios.set(peerId, audio);
      }
      audio.srcObject = stream;
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.removePeer(peerId);
      }
    };

    this.peers.set(peerId, pc);
    return pc;
  }

  private removePeer(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) { pc.close(); this.peers.delete(peerId); }
    const audio = this.remoteAudios.get(peerId);
    if (audio) { audio.srcObject = null; audio.remove(); this.remoteAudios.delete(peerId); }
  }

  leave() {
    if (this.channelId) {
      socket.send({ type: 'voice_leave', channel_id: this.channelId });
    }
    this.peers.forEach((pc, id) => this.removePeer(id));
    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;
    this.channelId = null;
    this.myUid = null;
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = !muted));
  }

  isActive() {
    return this.channelId !== null;
  }
}

export const voiceManager = new VoiceManager();
