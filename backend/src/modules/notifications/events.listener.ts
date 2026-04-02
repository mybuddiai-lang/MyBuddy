import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from './push.service';

@Injectable()
export class EventsListener {
  private readonly logger = new Logger(EventsListener.name);

  constructor(
    private gateway: NotificationsGateway,
    private pushService: PushService,
  ) {}

  @OnEvent('reminder.due')
  async onReminderDue({ reminder, user }: { reminder: any; user: any }) {
    // Real-time WebSocket notification
    this.gateway.sendReminder(reminder.userId, {
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      type: reminder.type,
      scheduledFor: reminder.scheduledFor,
    });

    // Push notification (even when app is closed)
    await this.pushService.sendToUser(reminder.userId, {
      title: `📚 ${reminder.title}`,
      body: reminder.description || 'Time to review your notes!',
      url: reminder.type === 'RECALL' ? '/recall' : '/home',
      tag: `reminder-${reminder.id}`,
    });

    this.logger.debug(`Reminder dispatched for user ${reminder.userId}`);
  }

  @OnEvent('note.processed')
  async onNoteProcessed({ noteId, userId }: { noteId: string; userId?: string }) {
    if (!userId) return;

    // Real-time update so the UI flips from "Processing…" to "Ready"
    this.gateway.sendNoteUpdate(userId, noteId, 'DONE');

    await this.pushService.sendToUser(userId, {
      title: '✅ Notes ready!',
      body: 'Your upload has been processed. Flashcards and reminders are set.',
      url: `/slides/${noteId}`,
      tag: `note-${noteId}`,
    });
  }

  @OnEvent('note.failed')
  onNoteFailed({ noteId, userId }: { noteId: string; userId?: string }) {
    if (!userId) return;
    this.gateway.sendNoteUpdate(userId, noteId, 'FAILED');
  }
}
