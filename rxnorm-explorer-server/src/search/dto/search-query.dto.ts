import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { SORT_DIRECTIONS, SORT_FIELDS } from '../search.service';

// Express turns a repeated key (?searchTerm=a&searchTerm=b) into an array, so
// every parameter is checked to be a single string before the service sees it.
export class SearchQueryDto {
  // Optional here so a missing or blank term gets the service's own
  // "Search term is required" error.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  searchTerm?: string;

  // The previous page's last value of the sort field; names run to 3000
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  cursor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: 'cursorId must be a whole number' })
  cursorId?: string;

  @IsOptional()
  @IsIn(SORT_FIELDS)
  sortField?: string;

  @IsOptional()
  @IsIn(SORT_DIRECTIONS)
  sortDirection?: (typeof SORT_DIRECTIONS)[number];
}
