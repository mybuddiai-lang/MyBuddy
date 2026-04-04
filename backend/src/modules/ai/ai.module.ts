import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AnthropicProvider } from './providers/anthropic.provider';

@Module({
  providers: [AiService, AnthropicProvider],
  exports: [AiService],
})
export class AiModule {}
