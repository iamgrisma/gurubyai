export interface SignalingEvent {
  seq?: number;
  type: string;
  from?: string;
  to?: string;
  role?: 'client' | 'guruba';
  participantId?: string;
  payload?: any;
  timestamp?: number;
}

export type SignalHandler = (event: SignalingEvent) => void;

export class DurableSignalingClient {
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private roomId: string;
  private role: 'client' | 'guruba';
  private participantId: string;
  private lastReceivedSeq: number = 0;
  private handlers: Set<SignalHandler> = new Set();
  private isExplicitlyClosed: boolean = false;
  private reconnectAttempts: number = 0;
  private pingIntervalId: any = null;

  constructor(
    signalingBaseUrl: string,
    roomId: string,
    role: 'client' | 'guruba',
    participantId?: string
  ) {
    const wsScheme = signalingBaseUrl.startsWith('https') ? 'wss' : 'ws';
    const host = signalingBaseUrl.replace(/^https?:\/\//, '');
    this.wsUrl = `${wsScheme}://${host}/signaling/room/${encodeURIComponent(roomId)}`;
    this.roomId = roomId;
    this.role = role;
    this.participantId = participantId || `${role}_${Math.random().toString(36).substring(2, 9)}`;
  }

  public connect(): void {
    this.isExplicitlyClosed = false;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.startHeartbeat();

        // If reconnecting after a drop, ask Durable Object to replay missed signals
        if (this.lastReceivedSeq > 0) {
          this.send({
            type: 'reconnect',
            role: this.role,
            participantId: this.participantId,
            lastReceivedSeq: this.lastReceivedSeq,
          });
        } else {
          this.send({
            type: 'join',
            role: this.role,
            participantId: this.participantId,
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data: SignalingEvent = JSON.parse(event.data);

          if (data.seq && data.seq > this.lastReceivedSeq) {
            this.lastReceivedSeq = data.seq;
          }

          if (data.type === 'pong') return;

          for (const handler of this.handlers) {
            handler(data);
          }
        } catch (err) {
          console.error('[Signaling] Failed to parse message:', err);
        }
      };

      this.ws.onclose = () => {
        this.stopHeartbeat();
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[Signaling] WebSocket error:', err);
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  public send(message: Record<string, any>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  public sendSignal(type: 'offer' | 'answer' | 'ice_candidate' | 'renegotiate', payload: any, to?: string): void {
    this.send({
      type,
      payload,
      to,
      from: this.participantId,
      role: this.role,
    });
  }

  public subscribe(handler: SignalHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopHeartbeat();
    if (this.ws) {
      this.send({ type: 'leave', role: this.role, participantId: this.participantId });
      this.ws.close();
      this.ws = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalId = setInterval(() => {
      this.send({ type: 'ping' });
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, delay);
  }
}
