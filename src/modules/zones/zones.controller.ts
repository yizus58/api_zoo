import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/types/user-role';
import { ZoneDetailDto, ZoneResponseDto } from './dto/zone-response.dto';
import { ZoneDto } from './dto/zone.dto';
import { Zone } from './zone.model';
import { ZonesService } from './zones.service';

@ApiTags('areas')
@ApiBearerAuth()
@Controller('areas')
export class ZonesController {
  constructor(private readonly zones: ZonesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiCreatedResponse({ type: ZoneResponseDto })
  @ApiConflictResponse({
    description: 'Ya hay una zona existente con ese nombre',
  })
  create(@Body() dto: ZoneDto): Promise<Zone> {
    return this.zones.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [ZoneDetailDto], description: '[] si no hay zonas' })
  findAll(): Promise<Zone[]> {
    return this.zones.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: ZoneDetailDto })
  @ApiNotFoundResponse({ description: 'No se encontró la zona especificada' })
  findById(@Param('id', ParseUUIDPipe) id: string): Promise<Zone> {
    return this.zones.findById(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  @ApiOkResponse({ type: ZoneResponseDto })
  @ApiNotFoundResponse({ description: 'No se encontró la zona especificada' })
  @ApiConflictResponse({
    description: 'Ya hay una zona existente con ese nombre',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ZoneDto,
  ): Promise<Zone> {
    return this.zones.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Zona eliminada' })
  @ApiNotFoundResponse({ description: 'No se encontró la zona especificada' })
  @ApiConflictResponse({ description: 'La zona contiene especies' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.zones.remove(id);
  }
}
