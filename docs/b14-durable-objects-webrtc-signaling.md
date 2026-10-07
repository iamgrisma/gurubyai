# B14: Resilient WebRTC Signaling via Cloudflare Durable Objects

## Overview
Video calls and online consultations require low-latency, stateful signaling to exchange SDP offers, answers, and ICE candidates between clients and Gurubas. On mobile networks in Nepal and developing regions, connections frequently experience jitter, packet loss, and temporary drops (e.g. carrier switching, elevators, network dead spots).

## Problem with Standard WebRTC Signaling
When a mobile phone loses network connectivity for a few seconds during negotiation:
1. Conventional WebSockets disconnect immediately.
2. ICE candidates sent during the offline gap are permanently lost.
3. The peer connection enters an unrecoverable state (`failed` or negotiation deadlock), forcing users to restart the call.

## Solution: Durable Object Room Coordinator (`MeetingSignalingDO`)
- **Stateful Room Lifecycle**: Each consultation room (`/signaling/room/:roomId`) maps directly to a Cloudflare Durable Object instance.
- **Monotonic Sequence Ordering (`seq`)**: Every signaling frame (offer, answer, ice_candidate, renegotiate) is assigned a strictly increasing integer sequence number.
- **Ring Buffer for Message Recovery**: The Durable Object maintains a ring buffer of recent signaling frames.
- **Resilient Reconnection Handshake**:
  - When a client experiences network disruption and reconnects, it sends:
    ```json
    {
      "type": "reconnect",
      "roomId": "...",
      "role": "client",
      "participantId": "...",
      "lastReceivedSeq": 42
    }
    ```
  - The Durable Object re-associates the session and **immediately replays all missed frames from sequence 43 onward**, seamlessly healing the WebRTC connection without dropping the call.
- **Heartbeat & Liveness**: 15-second ping/pong cycles detect dead peers with a 3-minute grace window for mobile reconnections.
