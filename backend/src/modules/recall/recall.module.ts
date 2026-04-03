import { Module } from '@nestjs/common';
import { RecallController } from './recall.controller';
import { RecallService } from './recall.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [RecallController],
  providers: [RecallService],
})
export class RecallModule {}
