import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class AnthropicProvider {
  private client: Anthropic;
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly model = 'claude-sonnet-4-6';

  constructor(private config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.get<string>('ANTHROPIC_API_KEY'),
    });
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>, systemPrompt: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';
    return {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }

  async complete(prompt: string, maxTokens = 500): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}
