export interface SignalingMessage {
  seq?: number;
  type:
    | "join"
    | "joined"
    | "reconnect"
    | "reconnected"
    | "peer_joined"
    | "peer_disconnected"
    | "peer_reconnected"
    | "offer"
    | "answer"
    | "ice_candidate"
    | "renegotiate"
    | "leave"
    | "ping"
    | "pong"
    | "error";
  from?: string;
  to?: string;
  role?: "client" | "guruba";
  participantId?: string;
  lastReceivedSeq?: number;
  payload?: unknown;
  timestamp?: number;
}

interface ParticipantSession {
  role: "client" | "guruba";
  participantId: string;
  status: "connected" | "reconnecting" | "disconnected";
  lastActive: number;
}

export class MeetingSignalingDO implements DurableObject {
  private state: DurableObjectState;
  private sockets: Map<WebSocket, { role: "client" | "guruba"; participantId: string }>;
  private sessions: Map<string, ParticipantSession>;
  private messageLog: SignalingMessage[];
  private currentSeq: number;
  private maxBufferSize: number = 250;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.sockets = new Map();
    this.sessions = new Map();
    this.messageLog = [];
    this.currentSeq = 0;
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket Upgrade", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [clientSocket, serverSocket] = Object.values(webSocketPair);

    serverSocket.accept();
    this.setupWebSocket(serverSocket);

    return new Response(null, {
      status: 101,
      webSocket: clientSocket,
    });
  }

  private setupWebSocket(socket: WebSocket) {
    socket.addEventListener("message", async (event) => {
      try {
        const raw = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
        const data: SignalingMessage = JSON.parse(raw);
        await this.handleMessage(socket, data);
      } catch (err) {
        socket.send(
          JSON.stringify({
            type: "error",
            payload: `Invalid signaling payload: ${String(err)}`,
          })
        );
      }
    });

    socket.addEventListener("close", () => {
      this.handleSocketClose(socket);
    });

    socket.addEventListener("error", () => {
      this.handleSocketClose(socket);
    });
  }

  private async handleMessage(socket: WebSocket, msg: SignalingMessage) {
    const now = Date.now();

    // 1. Ping / Pong Heartbeat
    if (msg.type === "ping") {
      socket.send(JSON.stringify({ type: "pong", timestamp: now }));
      const meta = this.sockets.get(socket);
      if (meta) {
        const session = this.sessions.get(meta.participantId);
        if (session) session.lastActive = now;
      }
      return;
    }

    // 2. Initial Join
    if (msg.type === "join") {
      const role = msg.role || "client";
      const participantId = msg.participantId || `${role}_${Math.random().toString(36).substring(2, 9)}`;

      this.sockets.set(socket, { role, participantId });
      this.sessions.set(participantId, {
        role,
        participantId,
        status: "connected",
        lastActive: now,
      });

      // Notify joined participant
      socket.send(
        JSON.stringify({
          type: "joined",
          role,
          participantId,
          timestamp: now,
          activePeers: Array.from(this.sessions.values()).filter(
            (s) => s.participantId !== participantId && s.status === "connected"
          ),
        })
      );

      // Broadcast peer joined to other sockets
      this.broadcastToOthers(socket, {
        type: "peer_joined",
        role,
        participantId,
        timestamp: now,
      });
      return;
    }

    // 3. Resilient Reconnection (handles mobile drops / latency)
    if (msg.type === "reconnect") {
      const participantId = msg.participantId;
      const role = msg.role || "client";
      const lastSeq = Number(msg.lastReceivedSeq || 0);

      if (!participantId) {
        socket.send(JSON.stringify({ type: "error", payload: "participantId required for reconnect" }));
        return;
      }

      this.sockets.set(socket, { role, participantId });
      const session = this.sessions.get(participantId) || {
        role,
        participantId,
        status: "connected",
        lastActive: now,
      };
      session.status = "connected";
      session.lastActive = now;
      this.sessions.set(participantId, session);

      // Reconnection Ack
      socket.send(
        JSON.stringify({
          type: "reconnected",
          participantId,
          lastReplayedSeq: this.currentSeq,
          timestamp: now,
        })
      );

      // Replay all buffered signals missed while disconnected
      const missedMessages = this.messageLog.filter(
        (m) => (m.seq || 0) > lastSeq && (!m.to || m.to === participantId)
      );

      for (const missed of missedMessages) {
        socket.send(JSON.stringify(missed));
      }

      // Notify peer that participant has reconnected
      this.broadcastToOthers(socket, {
        type: "peer_reconnected",
        role,
        participantId,
        timestamp: now,
      });
      return;
    }

    // 4. WebRTC Signaling Frames (offer, answer, ice_candidate, renegotiate)
    const sender = this.sockets.get(socket);
    if (!sender) {
      socket.send(JSON.stringify({ type: "error", payload: "Join before sending signals" }));
      return;
    }

    this.currentSeq += 1;
    const framedMessage: SignalingMessage = {
      ...msg,
      seq: this.currentSeq,
      from: sender.participantId,
      role: sender.role,
      timestamp: now,
    };

    // Buffer for reconnection replay
    this.messageLog.push(framedMessage);
    if (this.messageLog.length > this.maxBufferSize) {
      this.messageLog.shift();
    }

    // Dispatch to target or broadcast to peer
    if (msg.to) {
      this.sendToParticipant(msg.to, framedMessage);
    } else {
      this.broadcastToOthers(socket, framedMessage);
    }
  }

  private sendToParticipant(participantId: string, message: SignalingMessage) {
    for (const [sock, meta] of this.sockets.entries()) {
      if (meta.participantId === participantId && sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify(message));
      }
    }
  }

  private broadcastToOthers(senderSocket: WebSocket, message: SignalingMessage) {
    for (const [sock] of this.sockets.entries()) {
      if (sock !== senderSocket && sock.readyState === WebSocket.OPEN) {
        sock.send(JSON.stringify(message));
      }
    }
  }

  private handleSocketClose(socket: WebSocket) {
    const meta = this.sockets.get(socket);
    if (meta) {
      this.sockets.delete(socket);
      const session = this.sessions.get(meta.participantId);
      if (session) {
        session.status = "reconnecting"; // Allow grace window for mobile network recovery
        session.lastActive = Date.now();
      }

      this.broadcastToOthers(socket, {
        type: "peer_disconnected",
        role: meta.role,
        participantId: meta.participantId,
        timestamp: Date.now(),
      });
    }
  }
}
