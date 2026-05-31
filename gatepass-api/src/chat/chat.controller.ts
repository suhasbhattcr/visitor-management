import { Controller, Get, Query } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * GET /chat/history?threadKey=security:A101
   * Returns up to 100 most-recent messages for the thread, oldest-first.
   */
  @Get('history')
  getHistory(@Query('threadKey') threadKey: string) {
    if (!threadKey) return [];
    return this.chatService.getThreadHistory(threadKey, 100);
  }

  /**
   * GET /chat/threads?unit=A101
   * Returns the thread keys that involve this unit (so resident can pre-load threads).
   */
  @Get('threads')
  getThreads(@Query('unit') unit: string) {
    if (!unit) return [];
    return this.chatService.getThreadsForUnit(unit);
  }
}
