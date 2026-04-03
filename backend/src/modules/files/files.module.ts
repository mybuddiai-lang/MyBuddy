import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AiModule, AnalyticsModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
