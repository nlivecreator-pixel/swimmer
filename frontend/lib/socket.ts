type Handler = (msg: any) => void;

function getWsUrl(uid: string): string {
  if (typeof window === 'undefined') return '';
  const envUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (envUrl) return `${envUrl}/ws/${uid}`;
  // Auto-detect: if on HTTPS (Replit), use WSS
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

  connect(uid: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.uid === uid) return;
    this.uid = uid;
    this.open();
  }

  private open() {
    if (!this.uid) return;
    const url = getWsUrl(this.uid);
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.queue.forEach(m => this.ws!.send(m));
      this.queue = [];
    };
    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        (this.handlers.get(msg.type) || []).forEach(h => h(msg));
        (this.handlers.get('*') || []).forEach(h => h(msg));
      } catch {}
    };
    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.open(), 2500);
    };
    this.ws.onerror = () => this.ws?.close();
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close(); this.ws = null;
  }

  send(payload: object) {
    const raw = JSON.stringify(payload);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(raw);
    else this.queue.push(raw);
  }

  on(type: string, handler: Handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: Handler) {
    const arr = this.handlers.get(type);
    if (arr) this.handlers.set(type, arr.filter(h => h !== handler));
  }
}

export const socket = new SocketClient();
