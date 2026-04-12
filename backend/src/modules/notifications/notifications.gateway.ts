import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwt.verify(token, { secret: this.config.get('JWT_SECRET', 'buddi-secret-key') });
      client.data.userId = payload.sub;

      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub).add(client.id);
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      const sockets = this.userSockets.get(client.data.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSockets.delete(client.data.userId);
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  // ─── Community rooms ────────────────────────────────────────────────────────

  @SubscribeMessage('community:join')
  handleJoinCommunity(@ConnectedSocket() client: Socket, @MessageBody() communityId: string) {
    client.join(`community:${communityId}`);
    return { joined: communityId };
  }

  @SubscribeMessage('community:leave')
  handleLeaveCommunity(@ConnectedSocket() client: Socket, @MessageBody() communityId: string) {
    client.leave(`community:${communityId}`);
    return { left: communityId };
  }

  // Broadcast an event to all members of a community room
  broadcastToCommunity(communityId: string, event: string, data: any) {
    this.server.to(`community:${communityId}`).emit(event, data);
  }

  // ─── User-targeted helpers ──────────────────────────────────────────────────

  // Send real-time notification to specific user
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Broadcast to all connected users
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Broadcast to all connected users EXCEPT those in the given room (e.g. 'user:<userId>')
  broadcastExcept(room: string, event: string, data: any) {
    this.server.except(room).emit(event, data);
  }

  // Send new AI message in real-time (streaming feel)
  sendChatMessage(userId: string, message: any) {
    this.notifyUser(userId, 'chat:message', message);
  }

  // Send reminder notification
  sendReminder(userId: string, reminder: any) {
    this.notifyUser(userId, 'reminder:due', reminder);
  }

  // Send note processing update
  sendNoteUpdate(userId: string, noteId: string, status: string) {
    this.notifyUser(userId, 'note:status', { noteId, status });
  }
}
