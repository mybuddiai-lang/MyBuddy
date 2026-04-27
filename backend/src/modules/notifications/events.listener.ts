import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from './push.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class EventsListener {
  private readonly logger = new Logger(EventsListener.name);

  constructor(
    private gateway: NotificationsGateway,
    private pushService: PushService,
    private notificationsService: NotificationsService,
  ) {}

  @OnEvent('reminder.due')
  async onReminderDue({ reminder }: { reminder: any; user: any }) {
    // Persist notification to DB so it appears in the notification panel
    try {
      await this.notificationsService.create(
        reminder.userId,
        `⏰ ${reminder.title}`,
        reminder.description || 'Your reminder is due now.',
        'reminder',
        `/home?reminder=${reminder.id}`,
      );
    } catch (err) {
      this.logger.error(`Failed to save notification for user ${reminder.userId}`, err);
    }

    // Real-time WebSocket notification
    try {
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

    // Push notification (works when app is closed)
    try {
      await this.pushService.sendToUser(reminder.userId, {
        title: `⏰ ${reminder.title}`,
        body: reminder.description || 'Your reminder is due now.',
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

    // Persist notification
    try {
      await this.notificationsService.create(
        userId,
        '✅ Notes ready!',
        'Your upload has been processed. Flashcards and reminders are set.',
        'note',
        `/slides/${noteId}`,
      );
    } catch (err) {
      this.logger.error(`Failed to save note notification for user ${userId}`, err);
    }

    try {
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
