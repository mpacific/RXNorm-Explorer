import { Controller, Get, Query, Res } from '@nestjs/common';
import { SearchService } from './search.service';
import type { Response } from 'express';
import type { SearchResults } from '../../types/searchResults';

@Controller('search')
export class SearchController {
  constructor(private readonly serchService: SearchService) {}

  @Get()
  async searchDrugs(
    @Query('searchTerm') searchTerm: string,
    @Query('cursor') cursor: number,
    @Query('sortField') sortField: string,
    @Query('sortDirection') sortDirection: 'ASC' | 'DESC' | 'asc' | 'desc',
    @Res() res: Response,
  ): Promise<Response> {
    const drugs: SearchResults = await this.serchService.searchDrugs(
      searchTerm,
      cursor,
      sortField,
      sortDirection,
    );

    return res.status(200).json(drugs);
  }
}
