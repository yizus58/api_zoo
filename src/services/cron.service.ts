import { Injectable } from '@nestjs/common';
import { IndicatorsService } from './indicators.services';

@Injectable()
export class CronService {
  constructor(private readonly indicatorService: IndicatorsService) {}

  async executeDailyTask() {
    const data = await this.indicatorService.animalsCommentPerDay();
    console.log('Daily task executed:', data);
  }
}
