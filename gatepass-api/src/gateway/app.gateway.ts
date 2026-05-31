import { randomUUID } from 'crypto';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from '../chat/chat.service';
import { UsersService } from '../users/users.service';

// Evaluated at module-load time — process.env is populated by then via ConfigModule
const allowedOrigins = (process.env.CORS_ORIGIN ?? '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

@Injectable()
@WebSocketGateway({
  cors: {
    origin: (origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
  },
})
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly usersService: UsersService,
  ) {}

  // ─── Officer presence ────────────────────────────────────────────────────────
  // socketId → { officerId, officerName, gate }
  private readonly securityOfficers = new Map<string, { officerId: string; officerName: string; gate: string }>();

  private getOfficersList() {
    const seen = new Set<string>();
    const list: { officerId: string; officerName: string; gate: string }[] = [];
    for (const officer of this.securityOfficers.values()) {
      if (!seen.has(officer.officerId)) {
        seen.add(officer.officerId);
        list.push(officer);
      }
    }
    return list;
  }

  private broadcastOfficersOnline() {
    this.server.emit('officers:online', this.getOfficersList());
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private roomForUnit(unit: string) {
    return `unit:${String(unit).trim()}`;
  }

  private normalizeRole(value: unknown): 'security' | 'resident' | null {
    return value === 'security' || value === 'resident' ? value : null;
  }

  private buildThreadKey(opts: {
    senderRole: string;
    senderUnit: string | null;
    recipientRole: string;
    recipientUnit: string | null;
  }): string {
    const { senderRole, senderUnit, recipientRole, recipientUnit } = opts;
    // security ↔ resident: security:{officerId}:{unit}
    if (senderRole === 'security' && recipientRole === 'resident') {
      return `security:${senderUnit ?? 'unknown'}:${String(recipientUnit ?? '').toUpperCase()}`;
    }
    if (senderRole === 'resident' && recipientRole === 'security') {
      return `security:${recipientUnit ?? 'unknown'}:${String(senderUnit ?? '').toUpperCase()}`;
    }
    // security ↔ security: sec-sec:{sorted}
    if (senderRole === 'security' && recipientRole === 'security') {
      const [a, b] = [senderUnit ?? '', recipientUnit ?? ''].sort();
      return `sec-sec:${a}:${b}`;
    }
    // resident ↔ resident: flat:{sorted}
    if (senderRole === 'resident' && recipientRole === 'resident') {
      const [a, b] = [senderUnit ?? '', recipientUnit ?? '']
        .map((u) => String(u).trim().toUpperCase())
        .sort();
      return `flat:${a}:${b}`;
    }
    return 'thread:unknown';
  }

  private normalizeAttachment(raw: unknown) {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const kind = r.kind === 'image' || r.kind === 'video' ? r.kind : null;
    const dataUrl = String(r.dataUrl ?? '').trim();
    const name = String(r.name ?? '').trim().slice(0, 80);
    const mimeType = String(r.mimeType ?? '').trim().slice(0, 120);
    if (!kind || !dataUrl || dataUrl.length > 7_000_000 || !dataUrl.startsWith('data:')) return null;
    return { kind, dataUrl, name: name || null, mimeType: mimeType || null };
  }

  private createChatMessage(opts: {
    senderRole: string;
    senderUnit: string | null;
    senderName: string | null;
    recipientRole: string;
    recipientUnit: string | null;
    text: string;
    attachment: ReturnType<AppGateway['normalizeAttachment']>;
  }) {
    return {
      id: randomUUID(),
      senderRole: opts.senderRole,
      senderUnit: opts.senderUnit,
      senderName: opts.senderName ?? null,
      recipientRole: opts.recipientRole,
      recipientUnit: opts.recipientUnit,
      threadKey: this.buildThreadKey(opts),
      text: opts.text,
      attachment: opts.attachment ?? null,
      timestamp: new Date().toISOString(),
    };
  }

  private normalizeStatus(value: unknown) {
    return value === 'delivered' || value === 'seen' ? value : null;
  }

  // ─── Connection / Disconnection ──────────────────────────────────────────────

  async handleConnection(client: Socket) {
    const auth = client.handshake.auth as Record<string, string>;
    const q = client.handshake.query as Record<string, string>;
    const role = auth?.role ?? q?.role;
    const unit = auth?.unit ?? q?.unit;
    const officerId = String(auth?.officerId ?? q?.officerId ?? '').trim();
    const officerName = String(auth?.officerName ?? q?.officerName ?? 'Security').trim().slice(0, 60);
    const gate = String(auth?.gate ?? q?.gate ?? '').trim().slice(0, 40);
    const residentName = String(auth?.residentName ?? q?.residentName ?? '').trim().slice(0, 120) || null;
    const residentUserId = String(auth?.residentUserId ?? q?.residentUserId ?? '').trim() || null;

    if (role === 'security') {
      client.join('security-dashboard');
      if (officerId) {
        client.join(`officer:${officerId}`);
        this.securityOfficers.set(client.id, { officerId, officerName, gate });
        this.broadcastOfficersOnline();
        // Upsert this officer in the users table (best-effort, fields pre-exist from seed)
        this.usersService.upsert({ id: officerId, role: 'security', first_name: officerName, last_name: '', gate }).catch(() => {});
        try {
          const messages = await this.chatService.getHistoryForOfficer(officerId, 150);
          if (messages.length > 0) client.emit('chat:history', messages);
        } catch (_) { /* non-fatal */ }
      }
    }

    if (role === 'resident' && unit) {
      const upperUnit = String(unit).trim().toUpperCase();
      client.join(this.roomForUnit(upperUnit));
      // Upsert this resident (best-effort, fields pre-exist from seed)
      if (residentUserId) {
        this.usersService.upsert({ id: residentUserId, role: 'resident', first_name: residentName || upperUnit, last_name: '', unit: upperUnit }).catch(() => {});
      }
      try {
        const threadKeys = await this.chatService.getThreadsForUnit(upperUnit);
        const histories = await Promise.all(
          threadKeys.map((key) => this.chatService.getThreadHistory(key, 100)),
        );
        const messages = histories.flat().sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
        if (messages.length > 0) client.emit('chat:history', messages);
      } catch (_) { /* non-fatal */ }
      client.emit('officers:online', this.getOfficersList());
    }
  }

  handleDisconnect(client: Socket) {
    if (this.securityOfficers.has(client.id)) {
      this.securityOfficers.delete(client.id);
      this.broadcastOfficersOnline();
    }
  }

  // ─── Delivery broadcast (called directly by DeliverySubscriberService) ───────

  broadcastDeliveryEvent(event: { type: string; payload?: { unit?: string } }) {
    if (!event?.type) return;
    this.server.to('security-dashboard').emit('delivery:event', event);
    const eventUnit = event.payload?.unit;
    if (eventUnit) this.server.to(this.roomForUnit(eventUnit)).emit('delivery:event', event);
  }

  // ─── Chat ────────────────────────────────────────────────────────────────────

  @SubscribeMessage('chat:send')
  onChatSend(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const auth = client.handshake.auth as Record<string, string>;
    const q = client.handshake.query as Record<string, string>;
    const role = auth?.role ?? q?.role;
    const unit = auth?.unit ?? q?.unit;
    const officerId = String(auth?.officerId ?? q?.officerId ?? '').trim();
    const officerName = String(auth?.officerName ?? q?.officerName ?? 'Security').trim().slice(0, 60);

    const text = String(payload?.text ?? '').trim();
    const attachment = this.normalizeAttachment(payload?.attachment);
    const senderRole = this.normalizeRole(role);
    const recipientRole = this.normalizeRole(payload?.toRole);
    const toUnit = String(payload?.toUnit ?? '').trim();

    if ((!text && !attachment) || text.length > 500 || !senderRole || !recipientRole) return;

    // ── Security sender ──────────────────────────────────────────────────────
    if (senderRole === 'security') {
      if (!officerId) return;

      // Security → Resident (private)
      if (recipientRole === 'resident') {
        const recipientUnit = toUnit.toUpperCase();
        if (!recipientUnit) return;
        const message = this.createChatMessage({
          senderRole, senderUnit: officerId, senderName: officerName,
          recipientRole, recipientUnit, text, attachment,
        });
        this.chatService.save(message).catch(() => {});
        this.server.to(`officer:${officerId}`).emit('chat:message', message);
        this.server.to(this.roomForUnit(recipientUnit)).emit('chat:message', message);
        return;
      }

      // Security → Security (private between two officers)
      if (recipientRole === 'security') {
        const targetOfficerId = toUnit;
        if (!targetOfficerId || targetOfficerId === officerId) return;
        const message = this.createChatMessage({
          senderRole, senderUnit: officerId, senderName: officerName,
          recipientRole, recipientUnit: targetOfficerId, text, attachment,
        });
        this.chatService.save(message).catch(() => {});
        this.server.to(`officer:${officerId}`).emit('chat:message', message);
        this.server.to(`officer:${targetOfficerId}`).emit('chat:message', message);
        return;
      }
    }

    // ── Resident sender ──────────────────────────────────────────────────────
    if (senderRole === 'resident') {
      const senderUnit = String(unit ?? '').trim().toUpperCase();
      if (!senderUnit) return;
      // Use residentName from auth for display
      const residentSenderName = String(auth?.residentName ?? q?.residentName ?? '').trim().slice(0, 120) || senderUnit;

      // Resident → Security (private to specific officer, or broadcast if no target)
      if (recipientRole === 'security') {
        const targetOfficerId = toUnit || null;
        const message = this.createChatMessage({
          senderRole, senderUnit, senderName: residentSenderName,
          recipientRole, recipientUnit: targetOfficerId, text, attachment,
        });
        this.chatService.save(message).catch(() => {});
        this.server.to(this.roomForUnit(senderUnit)).emit('chat:message', message);
        if (targetOfficerId) {
          this.server.to(`officer:${targetOfficerId}`).emit('chat:message', message);
        } else {
          this.server.to('security-dashboard').emit('chat:message', message);
        }
        return;
      }

      // Resident → Resident (flat-to-flat, stays private between the two flats)
      if (recipientRole === 'resident') {
        const recipientUnit = toUnit.toUpperCase();
        if (!recipientUnit || recipientUnit === senderUnit) return;
        const message = this.createChatMessage({
          senderRole, senderUnit, senderName: residentSenderName,
          recipientRole, recipientUnit, text, attachment,
        });
        this.chatService.save(message).catch(() => {});
        this.server.to(this.roomForUnit(senderUnit)).emit('chat:message', message);
        this.server.to(this.roomForUnit(recipientUnit)).emit('chat:message', message);
      }
    }
  }

  @SubscribeMessage('chat:typing')
  onChatTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    const auth = client.handshake.auth as Record<string, string>;
    const q = client.handshake.query as Record<string, string>;
    const role = auth?.role ?? q?.role;
    const unit = auth?.unit ?? q?.unit;
    const officerId = String(auth?.officerId ?? q?.officerId ?? '').trim();

    const isTyping = Boolean(payload?.isTyping);
    const senderRole = this.normalizeRole(role);
    const recipientRole = this.normalizeRole(payload?.toRole);
    const toUnit = String(payload?.toUnit ?? '').trim();

    if (!senderRole || !recipientRole) return;

    if (senderRole === 'security' && officerId) {
      if (recipientRole === 'resident') {
        const recipientUnit = toUnit.toUpperCase();
        if (!recipientUnit) return;
        const typingEvent = { senderRole, senderUnit: officerId, recipientRole, recipientUnit, isTyping,
          threadKey: `security:${officerId}:${recipientUnit}` };
        this.server.to(this.roomForUnit(recipientUnit)).emit('chat:typing', typingEvent);
      }
      if (recipientRole === 'security' && toUnit && toUnit !== officerId) {
        const typingEvent = { senderRole, senderUnit: officerId, recipientRole, recipientUnit: toUnit, isTyping,
          threadKey: [`sec-sec:`, officerId, toUnit].sort().join(':').replace('sec-sec::', 'sec-sec:') };
        this.server.to(`officer:${toUnit}`).emit('chat:typing', typingEvent);
      }
      return;
    }

    if (senderRole === 'resident') {
      const senderUnit = String(unit ?? '').trim().toUpperCase();
      if (!senderUnit) return;
      if (recipientRole === 'security' && toUnit) {
        const typingEvent = { senderRole, senderUnit, recipientRole, recipientUnit: toUnit, isTyping,
          threadKey: `security:${toUnit}:${senderUnit}` };
        this.server.to(`officer:${toUnit}`).emit('chat:typing', typingEvent);
      }
      if (recipientRole === 'resident') {
        const recipientUnit = toUnit.toUpperCase();
        if (!recipientUnit || recipientUnit === senderUnit) return;
        const typingEvent = { senderRole, senderUnit, recipientRole, recipientUnit, isTyping,
          threadKey: [senderUnit, recipientUnit].sort().map(u => `flat:${u}`).join(':').replace('flat:', 'flat:').split(':').slice(0, 3).join(':') };
        this.server.to(this.roomForUnit(recipientUnit)).emit('chat:typing', typingEvent);
      }
    }
  }

  @SubscribeMessage('chat:status')
  onChatStatus(@ConnectedSocket() _client: Socket, @MessageBody() payload: any) {
    const messageId = String(payload?.messageId ?? '').trim();
    const status = this.normalizeStatus(payload?.status);
    const senderRole = this.normalizeRole(payload?.senderRole);
    const senderUnit = String(payload?.senderUnit ?? '').trim();
    const recipientRole = this.normalizeRole(payload?.recipientRole);
    const recipientUnit = String(payload?.recipientUnit ?? '').trim();
    const threadKey = String(payload?.threadKey ?? '').trim();

    if (!messageId || !status || !senderRole || !recipientRole || !threadKey) return;

    const event = { messageId, status, senderRole, senderUnit: senderUnit || null, recipientRole, recipientUnit: recipientUnit || null, threadKey };

    // Route status back to sender and recipient
    if (senderRole === 'security' && senderUnit) {
      this.server.to(`officer:${senderUnit}`).emit('chat:status', event);
    }
    if (senderRole === 'resident' && senderUnit) {
      this.server.to(this.roomForUnit(senderUnit)).emit('chat:status', event);
    }
    if (recipientRole === 'security' && recipientUnit) {
      this.server.to(`officer:${recipientUnit}`).emit('chat:status', event);
    }
    if (recipientRole === 'resident' && recipientUnit) {
      this.server.to(this.roomForUnit(recipientUnit)).emit('chat:status', event);
    }
  }

  // ─── Emergency ───────────────────────────────────────────────────────────────

  @SubscribeMessage('emergency:broadcast')
  onEmergency(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    if (!client.rooms.has('security-dashboard')) return;
    const message = String(payload?.message ?? 'Emergency alert from security').trim().slice(0, 300);
    this.server.emit('emergency:alert', {
      id: randomUUID(),
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
