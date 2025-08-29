import { Module } from '@nestjs/common';
import { RabbitMQController } from '../controllers/rabbitmq.controller';
import { RabbitMQService } from '../services/rabbitmq.services';

@Module({
  imports: [],
  controllers: [RabbitMQController],
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
