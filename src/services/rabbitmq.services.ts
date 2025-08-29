import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as amqp from 'amqplib';

export interface QueueMessage {
  type: string;
  data: {
    userId?: number;
    recipients: string | string[];
    subject: string;
    html: string;
    text?: string;
    attachments?: {
      name_file?: string;
      s3_name?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
  timestamp?: string;
  retryCount?: number;
  originalQueue?: string;
  failedAt?: Date;
  lastError?: string;
  finalFailure?: boolean;
}

interface RabbitConnection {
  createChannel(): Promise<amqp.Channel>;
  close(): Promise<void>;
}

@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private connection: RabbitConnection | null = null;
  private channel: amqp.Channel | null = null;
  private readonly queueRetry = 'email_retry_queue';

  async connect(queueName?: string): Promise<void> {
    try {
      this.connection = (await amqp.connect(
        process.env.RABBITMQ_URL || 'amqp://localhost',
      )) as RabbitConnection;

      if (!this.connection) {
        throw new Error('Failed to establish RabbitMQ connection');
      }

      this.channel = await this.connection.createChannel();

      if (!this.channel) {
        throw new Error('Failed to create RabbitMQ channel');
      }

      const defaultQueueName =
        queueName || process.env.QUEUE_NAME || 'email_queue';

      const dlqFinalName = `${defaultQueueName}.dlq.final`;

      try {
        await this.channel.checkQueue(defaultQueueName);
      } catch (error) {
        await this.channel.assertQueue(dlqFinalName, {
          durable: true,
        });

        await this.channel.assertQueue(this.queueRetry, {
          durable: true,
          arguments: {
            'x-message-ttl': 60000,
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': defaultQueueName,
          },
        });

        await this.channel.assertQueue(defaultQueueName, {
          durable: true,
          arguments: {
            'x-dead-letter-exchange': '',
            'x-dead-letter-routing-key': defaultQueueName,
          },
        });
        console.log('Created queues DLQ Final:', error);
      }
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async sendToQueue(queueName: string, message: any): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    await this.channel.sendToQueue(queueName, messageBuffer, {
      persistent: true,
    });
  }

  async publishToDeadLetterQueue(message: QueueMessage): Promise<void> {
    await this.sendToQueue(this.queueRetry, message);
  }

  async publishToFinalDLQ(message: QueueMessage): Promise<void> {
    const queueName = process.env.QUEUE_NAME || 'email_queue';
    const dlqFinalName = `${queueName}.dlq.final`;
    await this.sendToQueue(dlqFinalName, {
      ...message,
      failedAt: new Date(),
      finalFailure: true,
    });
  }

  async consumeFromQueue(
    queueName: string,
    callback: (message: any) => Promise<void>,
  ): Promise<void> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('RabbitMQ channel is not available');
    }

    await this.channel.consume(queueName, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await callback(content);
          this.channel?.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel?.nack(msg, false, false);
        }
      }
    });
  }

  async consumeMessages(
    queueName: string,
    callback: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    await this.consumeFromQueue(queueName, callback);
  }

  async consumeFromFinalDLQ(
    callback: (message: QueueMessage) => Promise<void>,
  ): Promise<void> {
    const queueName = process.env.QUEUE_NAME || 'email_queue';
    const dlqFinalName = `${queueName}.dlq.final`;
    await this.consumeFromQueue(dlqFinalName, callback);
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  // Función de backoff exponencial
  private createBackoffFunction<T extends any[], R>(
    baseDelay: number,
    maxRetries: number,
    fn: (...args: T) => Promise<R>,
    onFinalError?: (error: any, ...args: T) => void,
    onSuccess?: (result: R, ...args: T) => void,
    onRetry?: (error: any, ...args: T) => void,
  ) {
    return async (...args: T): Promise<R> => {
      let lastError: any;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const result = await fn(...args);
          if (onSuccess) {
            onSuccess(result, ...args);
          }
          return result;
        } catch (error) {
          lastError = error;

          if (attempt === maxRetries) {
            if (onFinalError) {
              onFinalError(error, ...args);
            }
            throw error;
          }

          if (onRetry) {
            onRetry(error, ...args);
          }

          // Calcular delay exponencial: baseDelay * 2^attempt
          const delay = baseDelay * Math.pow(2, attempt);
          console.log(
            `Reintentando en ${delay}ms (intento ${attempt + 1}/${maxRetries + 1})`,
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    };
  }

  // Método interno para publicar mensajes
  private async _publishMessageInternal(
    message: any,
  ): Promise<{ success: boolean; message: string }> {
    if (!this.channel) {
      await this.connect();
    }

    if (!this.channel) {
      throw new Error('No hay canal disponible para publicar');
    }

    const queueName = process.env.QUEUE_NAME || 'email_queue';
    await this.channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(message)),
      {
        persistent: true,
      },
    );

    return { success: true, message: 'Mensaje publicado correctamente' };
  }

  async publishMessageBackoff(
    message: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const publishWithBackoff = this.createBackoffFunction<
        [any],
        { success: boolean; message: string }
      >(
        1000, // 1 segundo de delay base
        15, // máximo 15 reintentos
        this._publishMessageInternal.bind(this),
        (error, message) => {
          console.error(
            'Error al publicar mensaje después del máximo de reintentos:',
            { error: error.message, message },
          );
        },
        (result, message) => {
          console.log('Mensaje publicado exitosamente con backoff');
        },
        (error, message) => {
          console.warn(
            'Intento de publicación falló, reintentando...',
            error.message,
          );
        },
      );

      return await publishWithBackoff(message);
    } catch (error) {
      console.error('Error en publishMessageBackoff:', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }
}
