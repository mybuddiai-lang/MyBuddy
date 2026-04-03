import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER', ''),
        pass: config.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendPasswordReset(email: string, token: string, name?: string) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"Buddi" <${this.config.get<string>('SMTP_FROM', 'noreply@buddi.app')}>`,
        to: email,
        subject: 'Reset your Buddi password',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #7c3aed; font-size: 24px; margin: 0;">Buddi</h1>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Student Resilience Infrastructure</p>
            </div>
            <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px;">Reset your password</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 8px;">Hi ${name || 'there'},</p>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset your Buddi password. Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #7c3aed; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">
                Reset Password
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; line-height: 1.6; border-top: 1px solid #f3f4f6; padding-top: 16px; margin-top: 24px;">
              This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password won't change.
            </p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${email}`, err);
    }
  }

  async sendWelcome(email: string, name: string) {
    try {
      await this.transporter.sendMail({
        from: `"Buddi" <${this.config.get<string>('SMTP_FROM', 'noreply@buddi.app')}>`,
        to: email,
        subject: `Welcome to Buddi, ${name}! 🎓`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #7c3aed; font-size: 24px; margin: 0;">Buddi</h1>
              <p style="color: #6b7280; font-size: 12px; margin: 4px 0 0;">Student Resilience Infrastructure</p>
            </div>
            <h2 style="color: #111827; font-size: 20px; margin-bottom: 12px;">Welcome, ${name}! 🎉</h2>
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
              You've just joined the smartest study platform for students like you. Buddi is your AI resilience companion — built to help you study smarter, stay motivated, and never burn out.
            </p>
            <p style="color: #374151; font-size: 14px; font-weight: 600; margin-bottom: 12px;">Here's what you can do:</p>
            <ul style="color: #374151; font-size: 14px; line-height: 2; padding-left: 20px; margin-bottom: 24px;">
              <li>📚 Upload your lecture slides and notes for AI-powered summaries</li>
              <li>🧠 Get spaced repetition recall quizzes from your own material</li>
              <li>💬 Chat with your AI study companion anytime you need support</li>
              <li>🤝 Join study pods with peers in your field</li>
              <li>⏰ Set smart reminders that adapt to your study pace</li>
            </ul>
            <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">
              Rooting for you, ${name}. — The Buddi Team
            </p>
          </div>
        `,
      });
      this.logger.log(`Welcome email sent to ${email}`);
    } catch (err) {
      this.logger.error(`Failed to send welcome email to ${email}`, err);
    }
  }
}
