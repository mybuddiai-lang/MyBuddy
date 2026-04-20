import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class OpenAIProvider {
  private client: OpenAI | null = null;
  private readonly logger = new Logger(OpenAIProvider.name);
  // Chat and lightweight tasks — fast, cheap
  private readonly chatModel = 'gpt-4o-mini';
  // File scanning (summarise, facts, key terms) — more capable
  private readonly scanModel: string;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — OpenAI features disabled');
    }
    this.scanModel = this.config.get<string>('OPENAI_SCAN_MODEL', 'gpt-4o');
    this.logger.log(`Chat model: ${this.chatModel} | Scan model: ${this.scanModel}`);
  }

  private get openai(): OpenAI {
    if (!this.client) throw new Error('OPENAI_API_KEY is not configured on this server.');
    return this.client;
  }

  async chat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<{ content: string; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: this.chatModel,
      messages,
      max_tokens: 1024,
    });
    return {
      content: response.choices[0]?.message?.content ?? '',
      tokens: response.usage?.total_tokens ?? 0,
    };
  }

  // Lightweight completions: sentiment, burnout, action items — uses chat model
  async complete(prompt: string, maxTokens = 500): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.chatModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  // File scanning: summarisation, fact extraction, key terms — uses upgraded scan model
  async scan(prompt: string, maxTokens = 1400): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.scanModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async transcribe(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const file = await toFile(buffer, filename, { type: mimeType });
    const response = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    return response.text;
  }
}
