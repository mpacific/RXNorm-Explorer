import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { DrugService } from './drug.service';
import { Drug } from '../types/drug';
import { DrugParamsDto } from './dto/drug-params.dto';

@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Get(':id')
  async getDrug(@Param() params: DrugParamsDto): Promise<Drug> {
    const id = Number(params.id);
    if (!id) {
      throw new HttpException('ID is required', HttpStatus.BAD_REQUEST);
    }

    const drug: Drug | null = await this.drugService.getDrug(id);

    if (!drug) {
      throw new HttpException('Drug not found', HttpStatus.NOT_FOUND);
    }

    return drug;
  }
}
