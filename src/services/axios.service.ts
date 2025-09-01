import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AxiosService {
  constructor(private readonly httpService: HttpService) {}

  async post(params: object) {
    try {
      const httpApi = process.env.MICROSERVICE_URL;
      const headers = { 'Content-Type': 'application/json' };

      const resultPost = this.httpService.post(httpApi+'/mail/send', params, {headers});

      const response = await firstValueFrom(resultPost);
      return response.data;
    } catch (error) {
      console.error(
        'Error en la petición:',
        error.response?.data || error.message,
      );
      throw error;
    }
  }
}
