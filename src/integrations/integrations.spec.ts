import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as amqp from 'amqplib';
import { RabbitMQService } from './messaging/rabbitmq.service';
import { EmailNotification } from './messaging/queue.constants';
import { S3Service } from './storage/s3.service';

jest.mock('amqplib', () => ({ connect: jest.fn() }));

const R2 = {
  R2_ACCOUNT_ID: 'acct',
  R2_BUCKET_ACCESS_KEY: 'ak',
  R2_BUCKET_SECRET_KEY: 'sk',
  R2_BUCKET_NAME: 'bucket',
};

describe('S3Service', () => {
  let send: jest.SpyInstance;
  beforeEach(() => {
    send = jest
      .spyOn(S3Client.prototype, 'send')
      .mockResolvedValue({} as never);
  });
  afterEach(() => send.mockRestore());

  it('uploads under a random 32-hex key and returns it', async () => {
    const service = new S3Service(new ConfigService(R2));
    const key = await service.upload(Buffer.from('data'), 'application/pdf');
    const other = await service.upload(Buffer.from('data'), 'application/pdf');
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(other).not.toBe(key);
    const command = send.mock.calls[0][0] as PutObjectCommand;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command.input).toEqual(
      expect.objectContaining({
        Bucket: 'bucket',
        Key: key,
        ContentType: 'application/pdf',
      }),
    );
  });

  it('deletes by key', async () => {
    await new S3Service(new ConfigService(R2)).delete('k1');
    const command = send.mock.calls[0][0] as DeleteObjectCommand;
    expect(command.input).toEqual({ Bucket: 'bucket', Key: 'k1' });
  });

  it('rejects empty files', async () => {
    await expect(
      new S3Service(new ConfigService(R2)).upload(Buffer.alloc(0), 'x'),
    ).rejects.toThrow(/vacío/);
  });

  it('starts without settings and fails only when used, naming what is missing', async () => {
    const service = new S3Service(new ConfigService({}));
    await expect(service.upload(Buffer.from('x'), 'x')).rejects.toThrow(
      'Faltan variables de almacenamiento: R2_ACCOUNT_ID, R2_BUCKET_ACCESS_KEY, R2_BUCKET_SECRET_KEY, R2_BUCKET_NAME',
    );
    expect(send).not.toHaveBeenCalled();
  });
});

describe('RabbitMQService', () => {
  const connect = amqp.connect as unknown as jest.Mock;
  const message: EmailNotification = {
    type: 'email_notification',
    data: { userId: 'u', recipients: 'a@mail.com', subject: 's', html: '<p/>' },
    timestamp: '2026-01-01T00:00:00.000Z',
  };
  const fakeConnection = () => {
    const channel = {
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      close: jest.fn(),
    };
    const connection = {
      on: jest.fn(),
      createChannel: jest.fn(async () => channel),
      close: jest.fn(),
    };
    return { channel, connection };
  };
  const service = (values: Record<string, string> = {}) =>
    new RabbitMQService(
      new ConfigService({ RABBITMQ_RETRY_DELAY_MS: '1', ...values }),
    );

  beforeEach(() => connect.mockReset());

  it('declares the api-mail topology once and publishes persistent JSON', async () => {
    const { channel, connection } = fakeConnection();
    connect.mockResolvedValue(connection);
    const rabbit = service({ RABBITMQ_URL: 'amqp://broker' });

    await rabbit.publish(message);
    await rabbit.publish(message);

    expect(connect).toHaveBeenCalledTimes(1);
    expect(connect).toHaveBeenCalledWith('amqp://broker');
    expect(channel.assertQueue.mock.calls.map((call) => call[0])).toEqual([
      'email_queue.dlq.final',
      'email_retry_queue',
      'email_queue',
    ]);
    expect(channel.assertQueue).toHaveBeenCalledWith('email_retry_queue', {
      durable: true,
      arguments: {
        'x-message-ttl': 60000,
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'email_queue',
      },
    });
    const [queue, body, options] = channel.sendToQueue.mock.calls[0];
    expect(queue).toBe('email_queue');
    expect(JSON.parse(body.toString())).toEqual(message);
    expect(options).toEqual({
      persistent: true,
      contentType: 'application/json',
    });
  });

  it('retries with a fresh connection, then succeeds', async () => {
    const { connection } = fakeConnection();
    connect
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValue(connection);
    await service().publish(message);
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it('gives up after RABBITMQ_PUBLISH_RETRIES and rethrows', async () => {
    connect.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(
      service({ RABBITMQ_PUBLISH_RETRIES: '2' }).publish(message),
    ).rejects.toThrow('ECONNREFUSED');
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('closes the channel and connection on shutdown', async () => {
    const { channel, connection } = fakeConnection();
    connect.mockResolvedValue(connection);
    const rabbit = service();
    await rabbit.publish(message);
    await rabbit.onModuleDestroy();
    expect(channel.close).toHaveBeenCalled();
    expect(connection.close).toHaveBeenCalled();
  });
});
