import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { DrugService } from './drug.service';
import { Drug } from '../../types/drug';

@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  @Get(':id')
  async getDrug(
    @Param('id') id: number,
    @Res() res: Response,
  ): Promise<Response> {
    const drug: Drug | null = await this.drugService.getDrug(id);

    if (!drug) {
      throw new HttpException('Drug not found', HttpStatus.NOT_FOUND);
    }

    return res.status(200).json(drug);
  }
}
