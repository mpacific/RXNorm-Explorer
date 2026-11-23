import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheControlInterceptor } from '../shared/cache-control.interceptor';
import { SearchService } from './search.service';
import type { SearchResults } from '../types/searchResults';
import { SearchQueryDto } from './dto/search-query.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @UseInterceptors(CacheControlInterceptor)
  searchDrugs(@Query() query: SearchQueryDto): Promise<SearchResults> {
    return this.searchService.searchDrugs(
      query.searchTerm,
      query.cursor,
      query.cursorId,
      query.sortField,
      query.sortDirection,
    );
  }
}
