import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import {
  DEFAULT_EMAIL_QUEUE,
  EMAIL_RETRY_QUEUE,
  EmailNotification,
  finalDeadLetterQueue,
  RETRY_DELAY_MS,
} from './queue.constants';

type Connection = Awaited<ReturnType<typeof amqp.connect>>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Publishes e-mail notifications to the queue consumed by api-mail. Connects lazily, declares
 * the same queue topology as api-mail and retries a failed publish with exponential backoff.
 */
@Injectable()
export class RabbitMQService implements OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(private readonly config: ConfigService) {}

  get queueName(): string {
    return this.config.get<string>('QUEUE_NAME', DEFAULT_EMAIL_QUEUE);
  }

  async publish(message: EmailNotification): Promise<void> {
    const maxRetries = Number(this.config.get('RABBITMQ_PUBLISH_RETRIES', 5));
    const baseDelay = Number(this.config.get('RABBITMQ_RETRY_DELAY_MS', 1000));

    for (let attempt = 0; ; attempt++) {
      try {
        const channel = await this.getChannel();
        channel.sendToQueue(
          this.queueName,
          Buffer.from(JSON.stringify(message)),
          {
            persistent: true,
            contentType: 'application/json',
          },
        );
        return;
      } catch (error) {
        await this.reset();
        if (attempt >= maxRetries) {
          throw error;
        }
        const delay = baseDelay * 2 ** attempt;
        this.logger.warn(
          `Publicación fallida (${(error as Error).message}); reintento ${attempt + 1}/${maxRetries} en ${delay} ms`,
        );
        await sleep(delay);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.reset();
  }

  private async getChannel(): Promise<amqp.Channel> {
    if (this.channel) {
      return this.channel;
    }
    const connection = await amqp.connect(
      this.config.get<string>('RABBITMQ_URL', 'amqp://localhost'),
    );
    connection.on('error', (error: Error) =>
      this.logger.error(`Conexión RabbitMQ: ${error.message}`),
    );
    connection.on('close', () => {
      this.connection = null;
      this.channel = null;
    });
    const channel = await connection.createChannel();
    await this.declareTopology(channel);
    this.connection = connection;
    this.channel = channel;
    return channel;
  }

  /** Same queues and arguments as api-mail declares. */
  private async declareTopology(channel: amqp.Channel): Promise<void> {
    const queue = this.queueName;
    await channel.assertQueue(finalDeadLetterQueue(queue), { durable: true });
    await channel.assertQueue(EMAIL_RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': RETRY_DELAY_MS,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': queue,
      },
    });
    await channel.assertQueue(queue, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': queue,
      },
    });
  }

  private async reset(): Promise<void> {
    const { channel, connection } = this;
    this.channel = null;
    this.connection = null;
    try {
      await channel?.close();
    } catch {
      // already closed
    }
    try {
      await connection?.close();
    } catch {
      // already closed
    }
  }
}
