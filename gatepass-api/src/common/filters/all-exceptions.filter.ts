import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const httpEx = exception as HttpException;
      const status = httpEx.getStatus();
      const body = httpEx.getResponse();
      res.status(status).json(
        typeof body === 'string' ? { error: body } : body,
      );
      return;
    }

    console.error('[api] unhandled error:', (exception as Error)?.message ?? exception);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error' });
  }
}
