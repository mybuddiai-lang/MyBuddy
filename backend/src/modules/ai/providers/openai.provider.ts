import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI, { toFile } from 'openai';

@Injectable()
export class OpenAIProvider {
  private client: OpenAI;
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly model = 'gpt-4o-mini';

  constructor(private config: ConfigService) {
    this.client = new OpenAI({
      apiKey: this.config.get<string>('OPENAI_API_KEY'),
    });
  }

  async chat(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<{ content: string; tokens: number }> {
    const response = await this.client.chat.completions.create({
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
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content ?? '';
  }

  async transcribe(buffer: Buffer, mimeType: string, filename: string): Promise<string> {
    const file = await toFile(buffer, filename, { type: mimeType });
    const response = await this.client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });
    return response.text;
  }
}
