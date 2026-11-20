import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { inspect } from 'util';
import {
  DatabaseError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
} from 'sequelize';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

/**
 * Turns every exception into the same JSON shape. Constraint violations that slip past the
 * service checks (two requests racing) become 409 instead of 500. Anything unexpected is
 * logged with its stack and answered with a generic 500 that reveals no internals.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const body = this.toErrorBody(
      exception,
      request.originalUrl ?? request.url,
    );
    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${body.path} -> ${body.statusCode}`,
        exception instanceof Error ? exception.stack : inspect(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  toErrorBody(exception: unknown, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            exception.message);
      const error =
        typeof payload === 'object' &&
        typeof (payload as { error?: unknown }).error === 'string'
          ? (payload as { error: string }).error
          : this.reasonPhrase(statusCode);
      return { statusCode, error, message, path, timestamp };
    }

    if (exception instanceof UniqueConstraintError) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'Ya existe un registro con esos datos',
        path,
        timestamp,
      };
    }

    if (exception instanceof ForeignKeyConstraintError) {
      return {
        statusCode: HttpStatus.CONFLICT,
        error: 'Conflict',
        message: 'La operación viola una relación con otros registros',
        path,
        timestamp,
      };
    }

    if (
      exception instanceof DatabaseError &&
      /invalid input syntax for type uuid/i.test(exception.message)
    ) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Identificador inválido',
        path,
        timestamp,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Error interno del servidor',
      path,
      timestamp,
    };
  }

  private reasonPhrase(status: number): string {
    const name = HttpStatus[status];
    return name
      ? name
          .toLowerCase()
          .split('_')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : 'Error';
  }
}
