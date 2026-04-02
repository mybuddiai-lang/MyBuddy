import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';

@Module({
  providers: [AiService, AnthropicProvider, OpenAIProvider],
  exports: [AiService],
})
export class AiModule {}
