import { Module } from '@nestjs/common';
import { CapabilityModule } from '@lark-apaas/fullstack-nestjs-core';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [CapabilityModule.forRoot()],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
