import { Controller, Get, Query, Res } from '@nestjs/common';
import { SearchService } from './search.service';
import type { Response } from 'express';
import type { SearchResults } from '../types/searchResults';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly serchService: SearchService) {}

  @Get()
  async searchDrugs(
    @Query() query: SearchQueryDto,
    @Res() res: Response,
  ): Promise<Response> {
    const drugs: SearchResults = await this.serchService.searchDrugs(
      query.searchTerm,
      query.cursor,
      query.cursorId,
      query.sortField,
      query.sortDirection,
    );

    return res.status(200).json(drugs);
  }
}
