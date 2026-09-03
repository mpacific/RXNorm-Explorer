import {
  DataGrid,
  GridRowParams,
  GridSortDirection,
  GridSortModel,
} from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Drug } from '../../../rxnorm-explorer-server/types/drug';
import { SortFields } from '../types/sortFields';
import { Cursor } from '../types/cursor';

const FIRST_PAGE: Record<number, Cursor | null> = { 0: null };

export default function SearchResultsList(props: {
  searchResults: Drug[] | undefined;
  totalCount?: number;
  loading: boolean;
  sortField: SortFields;
  sortDirection: string;
  setCursor: (cursor: Cursor | null) => void;
  changeSort: (sortField: SortFields, sortDirection: string) => void;
}) {
  const defaultSortingModel: GridSortModel = [
    {
      field: 'STR',
      sort: 'asc',
    },
  ];

  const router = useRouter();
  const [paginationModel, setPagionationModel] = useState({
    page: 0,
    pageSize: 50,
  });
  const [sortingModel, setSortingModel] =
    useState<GridSortModel>(defaultSortingModel);
  // Cursor to use for each page we've already visited. Page 0 is seeded with
  // null so paging back to the start doesn't read a missing key.
  const [pageCursors, setPageCursors] =
    useState<Record<number, Cursor | null>>(FIRST_PAGE);

  const columns = [
    {
      field: 'STR',
      headerName: 'Drug Name',
      width: 600,
    },
    {
      field: 'RXCUI',
      headerName: 'RXCUI',
    },
    {
      field: 'TTY',
      headerName: 'TTY',
    },
  ];

  const rows: Drug[] = (props.searchResults ?? []).map((searchResult) => ({
    id: Number(searchResult.id),
    RXCUI: searchResult.RXCUI,
    TTY: searchResult.TTY,
    STR: searchResult.STR,
  }));

  const handlePaginationModelChange = (newPaginationModel: {
    page: number;
    pageSize: number;
  }) => {
    if (newPaginationModel.page < paginationModel.page) {
      props.setCursor(pageCursors[newPaginationModel.page] ?? null);
    } else {
      const lastRow = rows[rows.length - 1];

      // Nothing to page forward from -- leave the grid where it is rather than
      // sending an empty cursor and losing our place entirely.
      if (!lastRow) {
        return;
      }

      const nextCursor: Cursor = {
        value: String(lastRow[props.sortField]),
        id: lastRow.id,
      };

      props.setCursor(nextCursor);
      setPageCursors({
        ...pageCursors,
        [newPaginationModel.page]: nextCursor,
      });
    }

    setPagionationModel(newPaginationModel);
  };

  const handleSortingModelChange = (newSortingModel: GridSortModel) => {
    if (!newSortingModel?.[0]) {
      // If the sort direction is blank, then just go the opposite way
      newSortingModel = [
        {
          field: props.sortField,
          sort:
            props.sortDirection === 'desc'
              ? 'asc'
              : ('desc' as GridSortDirection),
        },
      ];
    }

    props.changeSort(
      newSortingModel[0].field! as SortFields,
      newSortingModel[0].sort!
    );
    setSortingModel(newSortingModel);

    // The cursors we collected describe the old ordering, so drop them and
    // start again from the first page.
    setPageCursors(FIRST_PAGE);
    setPagionationModel({ ...paginationModel, page: 0 });
  };

  return (
    <DataGrid
      pageSizeOptions={[50]}
      rows={rows}
      columns={columns}
      onRowClick={(params: GridRowParams) => {
        router.push(`/drug/${params.id}`);
      }}
      rowCount={props.totalCount || 0}
      rowSelection={false}
      disableColumnMenu={true}
      paginationMode="server"
      sortingMode="server"
      paginationModel={paginationModel}
      sortModel={sortingModel}
      onPaginationModelChange={handlePaginationModelChange}
      onSortModelChange={handleSortingModelChange}
      loading={props.loading}
    />
  );
}
