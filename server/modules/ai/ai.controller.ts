import { Body, Controller, Post } from '@nestjs/common';
import { AiService, MentorChatDto, MentorTtsDto } from './ai.service';

/**
 * 思辨小院 · AI 先生接口
 * - POST /api/ai/mentor-chat  追问陪练（不判对错、不给答案）
 * - POST /api/ai/mentor-tts   AI 回复朗读（两院两种声音）
 */
@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('mentor-chat')
  async chat(@Body() body: MentorChatDto) {
    return this.aiService.chat(body);
  }

  @Post('mentor-tts')
  async tts(@Body() body: MentorTtsDto) {
    return this.aiService.tts(body);
  }
}
