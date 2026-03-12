type Handler = (msg: any) => void;

function getWsUrl(uid: string): string {
  if (typeof window === 'undefined') return '';
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return `${envUrl}/ws/${uid}`;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host  = window.location.hostname;
  const port  = host === 'localhost' ? ':8000' : '';
  return `${proto}//${host}${port}/ws/${uid}`;
}

class SocketClient {
  private ws: WebSocket | null = null;
  private uid: string | null = null;
  private handlers: Map<string, Handler[]> = new Map();
  private queue: string[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private onSessionExpired: (() => void) | null = null;

  setSessionExpiredCallback(cb: () => void) {
    this.onSessionExpired = cb;
  }

  connect(uid: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.uid === uid) return;
    this.uid = uid;
    this.open();
  }

  private open() {
    if (!this.uid) return;
    const url = getWsUrl(this.uid);
    try {
      this.ws = new WebSocket(url);
    } catch (e) {
      console.error('[socket] Failed to create WebSocket:', e);
      this.reconnectTimer = setTimeout(() => this.open(), 3000);
      return;
    }

    this.ws.onopen = () => {
      console.log('[socket] connected');
      this.queue.forEach(m => this.ws!.send(m));
      this.queue = [];
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        // Handle session expired — logout immediately
        if (msg.type === 'error' && msg.code === 'SESSION_EXPIRED') {
          console.warn('[socket] Session expired');
          if (this.onSessionExpired) this.onSessionExpired();
          return;
        }
        (this.handlers.get(msg.type) || []).forEach(h => h(msg));
        (this.handlers.get('*') || []).forEach(h => h(msg));
      } catch {}
    };

    this.ws.onclose = (e) => {
      console.log('[socket] closed', e.code, e.reason);
      // Don't reconnect if intentionally closed (1008 = policy violation = session expired)
      if (e.code === 1008) return;
      this.reconnectTimer = setTimeout(() => this.open(), 2500);
    };

    this.ws.onerror = (e) => {
      console.error('[socket] error', e);
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
    this.uid = null;
    this.queue = [];
  }

  send(payload: object) {
    const raw = JSON.stringify(payload);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(raw);
    } else {
      this.queue.push(raw);
    }
  }

  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: Handler) {
    const arr = this.handlers.get(type);
    if (arr) this.handlers.set(type, arr.filter(h => h !== handler));
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const socket = new SocketClient();
