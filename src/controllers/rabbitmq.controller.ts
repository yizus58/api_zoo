import {
  Controller,
  Body,
  Post,
  HttpException,
  HttpStatus,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { RabbitMQService, QueueMessage } from '../services/rabbitmq.services';

export interface PublishMessageDto {
  queue?: string;
  message?: QueueMessage;
}

export interface EmailPublishDto {
  recipients: string | string[];
  subject: string;
  html: string;
  userId?: number;
  attachments?: {
    name_file?: string;
    s3_name?: string;
  };
}

@Controller()
export class RabbitMQController {
  private readonly maxRetryCount = 4;

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  // Endpoint POST para publicar mensajes con backoff
  @Post('publish-with-backoff')
  async publishWithBackoff(@Body() emailData: EmailPublishDto) {
    return this.RabbitMQPublisherBackoff(emailData);
  }

  // Función para publicar mensajes con backoff
  async RabbitMQPublisherBackoff(params: any) {
    try {
      const base = params?.data ? params.data : params || {};

      if (!base.recipients || !base.subject || !base.html) {
        console.error(
          'RabbitMQPublisherBackoff: parámetros inválidos para publicar mensaje',
          { params },
        );
        return;
      }

      const id = Math.floor(Math.random() * 1000000);

      const message: QueueMessage = {
        type: 'email_notification',
        data: {
          userId: base.userId ?? id,
          recipients: base.recipients,
          subject: base.subject,
          html: base.html,
          ...(base.attachments && { attachments: base.attachments }),
        },
        timestamp: new Date().toISOString(),
      };

      await this.rabbitMQService.publishMessageBackoff(message);

      return {
        success: true,
        message: 'Mensaje enviado correctamente con backoff',
        messageId: id,
      };
    } catch (error) {
      console.error('Error al enviar mensaje incluso con backoff:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Error al publicar mensaje con backoff',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async closeConnection() {
    try {
      await this.rabbitMQService.close();
      return {
        success: true,
        message: 'RabbitMQ connection closed successfully',
      };
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Error closing RabbitMQ connection',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
