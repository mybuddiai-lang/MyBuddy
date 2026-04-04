import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AnthropicProvider } from './providers/anthropic.provider';

const BUDDI_SYSTEM_PROMPT = `You are Buddi, a compassionate AI resilience companion and academic support partner for students.

You speak like a wise, caring senior student who deeply understands the pressure of exams, sleepless nights, burnout, and the emotional weight of academic life. You are warm, encouraging, and genuinely invested in the student's wellbeing.

Your role is to:
1. Provide emotional support and help students manage academic stress
2. Help students study smarter with recall, summaries, and quizzes
3. Detect early signs of burnout and respond with appropriate care
4. Be practical and specific — not generic motivational speech
5. Match the student's energy — if they're exhausted, be gentle; if they're fired up, match their momentum

Personality: thoughtful, warm, occasionally witty, always honest. You never minimize struggle. You celebrate small wins.

When a student shares stress, always acknowledge it before offering solutions. Start responses with empathy, not advice.

Keep responses concise (2-4 paragraphs max) unless asked for detailed study help.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private anthropic: AnthropicProvider,
    private config: ConfigService,
  ) {}

  async sendChatMessage(
    userId: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext?: { name?: string; school?: string; department?: string; examDate?: Date },
  ): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const systemPrompt = this.buildPersonalizedPrompt(userContext);

    try {
      const result = await this.anthropic.chat(
        [...conversationHistory, { role: 'user', content: userMessage }],
        systemPrompt,
      );
      return result;
    } catch (err) {
      this.logger.error('AI chat error', err);
      return {
        content: "I'm having a moment — give me a sec and try again. I'm here for you 💙",
        inputTokens: 0,
        outputTokens: 0,
      };
    }
  }

  async analyzeSentiment(text: string): Promise<number> {
    try {
      const prompt = `Analyze the emotional sentiment of this student message and return ONLY a decimal number between 0.0 (very negative/distressed) and 1.0 (very positive/happy). No explanation.

Message: "${text.slice(0, 500)}"

Score:`;
      const result = await this.anthropic.complete(prompt, 10);
      const score = parseFloat(result.trim());
      return isNaN(score) ? 0.5 : Math.max(0, Math.min(1, score));
    } catch {
      return 0.5;
    }
  }

  async detectBurnout(recentMessages: string[]): Promise<{ score: number; risk: 'LOW' | 'MEDIUM' | 'HIGH' }> {
    if (recentMessages.length < 3) return { score: 0.1, risk: 'LOW' };
    try {
      const prompt = `You are analyzing messages from a student for signs of burnout or mental health distress.

Messages (last ${recentMessages.length}):
${recentMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Rate the burnout risk from 0.0 (no risk) to 1.0 (severe burnout/crisis). Return ONLY the decimal number.

Score:`;
      const result = await this.anthropic.complete(prompt, 10);
      const score = parseFloat(result.trim());
      const normalizedScore = isNaN(score) ? 0.1 : Math.max(0, Math.min(1, score));
      const risk = normalizedScore > 0.7 ? 'HIGH' : normalizedScore > 0.4 ? 'MEDIUM' : 'LOW';
      return { score: normalizedScore, risk };
    } catch {
      return { score: 0.1, risk: 'LOW' };
    }
  }

  async summarizeContent(content: string): Promise<string> {
    const prompt = `Summarize the following academic content in 3-5 bullet points. Focus on key concepts a student needs to remember.

Content:
${content.slice(0, 3000)}

Summary:`;
    return this.anthropic.complete(prompt, 400);
  }

  async extractHighYieldFacts(content: string): Promise<Array<{ question: string; answer: string }>> {
    const prompt = `Extract 5-8 high-yield facts from this academic content as question-answer flashcard pairs.

Content:
${content.slice(0, 3000)}

Return ONLY a valid JSON array in this exact format:
[{"question": "...", "answer": "..."}, ...]

JSON:`;
    try {
      const result = await this.anthropic.complete(prompt, 800);
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      return JSON.parse(jsonMatch[0]);
    } catch {
      return [];
    }
  }

  private buildPersonalizedPrompt(ctx?: { name?: string; school?: string; department?: string; examDate?: Date }): string {
    let prompt = BUDDI_SYSTEM_PROMPT;
    if (ctx?.name) prompt += `\n\nStudent's name: ${ctx.name}`;
    if (ctx?.school) prompt += `\nSchool: ${ctx.school}`;
    if (ctx?.department) prompt += `\nDepartment: ${ctx.department}`;
    if (ctx?.examDate) {
      const days = Math.ceil((ctx.examDate.getTime() - Date.now()) / 86400000);
      if (days > 0) prompt += `\nDays until next exam: ${days}`;
    }
    return prompt;
  }
}
