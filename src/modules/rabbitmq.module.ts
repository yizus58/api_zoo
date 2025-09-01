import { Module } from '@nestjs/common';
import { RabbitMQService } from '../services/rabbitmq.services';

@Module({
  imports: [],
  controllers: [],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
