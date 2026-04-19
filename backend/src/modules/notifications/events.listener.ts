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
  async onReminderDue({ reminder }: { reminder: any; user: any }) {
    try {
      // Real-time WebSocket notification — always attempt first
      this.gateway.sendReminder(reminder.userId, {
        id: reminder.id,
        title: reminder.title,
        description: reminder.description,
        type: reminder.type,
        scheduledFor: reminder.scheduledFor,
      });
    } catch (err) {
      this.logger.error(`Failed to send WS reminder for user ${reminder.userId}`, err);
    }

    // Push notification (even when app is closed) — independent of WS
    try {
      await this.pushService.sendToUser(reminder.userId, {
        title: `📚 ${reminder.title}`,
        body: reminder.description || 'Time to review your notes!',
        url: `/home?reminder=${reminder.id}`,
        tag: `reminder-${reminder.id}`,
      });
    } catch (err) {
      this.logger.error(`Failed to send push reminder for user ${reminder.userId}`, err);
    }

    this.logger.debug(`Reminder dispatched for user ${reminder.userId}`);
  }

  @OnEvent('note.processed')
  async onNoteProcessed({ noteId, userId }: { noteId: string; userId?: string }) {
    if (!userId) return;

    try {
      // Real-time update so the UI flips from "Processing…" to "Ready"
      this.gateway.sendNoteUpdate(userId, noteId, 'DONE');
    } catch (err) {
      this.logger.error(`Failed to send WS note update for user ${userId}`, err);
    }

    try {
      await this.pushService.sendToUser(userId, {
        title: '✅ Notes ready!',
        body: 'Your upload has been processed. Flashcards and reminders are set.',
        url: `/slides/${noteId}`,
        tag: `note-${noteId}`,
      });
    } catch (err) {
      this.logger.error(`Failed to send push for note.processed, user ${userId}`, err);
    }
  }

  @OnEvent('note.failed')
  onNoteFailed({ noteId, userId }: { noteId: string; userId?: string }) {
    if (!userId) return;
    try {
      this.gateway.sendNoteUpdate(userId, noteId, 'FAILED');
    } catch (err) {
      this.logger.error(`Failed to send WS note-failed update for user ${userId}`, err);
    }
  }
}
