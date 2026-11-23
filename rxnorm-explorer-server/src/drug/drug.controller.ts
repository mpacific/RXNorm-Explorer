import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  UseInterceptors,
} from '@nestjs/common';
import { DrugService } from './drug.service';
import { Drug } from '../types/drug';
import { DrugParamsDto } from './dto/drug-params.dto';
import { CacheControlInterceptor } from '../shared/cache-control.interceptor';

@Controller('drug')
export class DrugController {
  constructor(private readonly drugService: DrugService) {}

  // Keyed on RXAUI rather than the surrogate id, so links and bookmarks keep
  // pointing at the same drug after the monthly data reload.
  @Get(':rxaui')
  @UseInterceptors(CacheControlInterceptor)
  async getDrug(@Param() params: DrugParamsDto): Promise<Drug> {
    const drug: Drug | null = await this.drugService.getDrug(params.rxaui);

    if (!drug) {
      throw new HttpException('Drug not found', HttpStatus.NOT_FOUND);
    }

    return drug;
  }
}
