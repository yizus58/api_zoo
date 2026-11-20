/**
 * RabbitMQ contract shared with api-mail (the consumer) and the other producers. RabbitMQ
 * rejects a queue re-declared with different arguments, so these must match api-mail.
 */
export const DEFAULT_EMAIL_QUEUE = 'email_queue';
export const EMAIL_RETRY_QUEUE = 'email_retry_queue';
export const RETRY_DELAY_MS = 60000;
export const EMAIL_NOTIFICATION_TYPE = 'email_notification';

export const finalDeadLetterQueue = (queueName: string): string =>
  `${queueName}.dlq.final`;

export interface EmailAttachment {
  name_file: string;
  s3_name: string;
}

export interface EmailNotification {
  type: typeof EMAIL_NOTIFICATION_TYPE;
  data: {
    userId: string;
    recipients: string;
    subject: string;
    html: string;
    attachments?: EmailAttachment[];
  };
  timestamp: string;
}
