import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class OpenAIProvider {
  private client: OpenAI | null = null;
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly model = 'gpt-4o-mini';

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.logger.warn('OPENAI_API_KEY not set — OpenAI features disabled');
    }
  }

  private get openai(): OpenAI {
    if (!this.client) throw new Error('OPENAI_API_KEY is not configured on this server.');
    return this.client;
  }

  async chat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<{ content: string; tokens: number }> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: 1024,
    });
    return {
      content: response.choices[0]?.message?.content ?? '',
      tokens: response.usage?.total_tokens ?? 0,
    };
  }

  async complete(prompt: string, maxTokens = 500): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
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
