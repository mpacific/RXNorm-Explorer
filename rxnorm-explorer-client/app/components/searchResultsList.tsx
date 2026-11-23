import {
  DataGrid,
  GridRenderCellParams,
  GridRowParams,
  GridSortDirection,
  GridSortModel,
} from '@mui/x-data-grid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { SearchResult } from '../types/searchResult';
import { SortFields } from '../types/sortFields';
import { Cursor } from '../types/cursor';

const FIRST_PAGE: Record<number, Cursor | null> = { 0: null };

export default function SearchResultsList(props: {
  searchResults: SearchResult[] | undefined;
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
  const [paginationModel, setPaginationModel] = useState({
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
      // A real link, so the drug can be reached by keyboard and opened in a
      // new tab; the row click below is only a shortcut for mouse users.
      renderCell: (params: GridRenderCellParams<SearchResult>) => (
        <Link href={`/drug/${params.row.RXAUI}`}>{params.row.STR}</Link>
      ),
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

  const rows: SearchResult[] = (props.searchResults ?? []).map(
    (searchResult) => ({
      id: Number(searchResult.id),
      RXAUI: searchResult.RXAUI,
      RXCUI: searchResult.RXCUI,
      TTY: searchResult.TTY,
      STR: searchResult.STR,
    })
  );

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

    setPaginationModel(newPaginationModel);
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
    setPaginationModel({ ...paginationModel, page: 0 });
  };

  return (
    <DataGrid
      pageSizeOptions={[50]}
      rows={rows}
      columns={columns}
      onRowClick={(params: GridRowParams<SearchResult>, event) => {
        // A click on the link itself is the link's to handle (including
        // middle-click and modifier keys); don't navigate twice.
        if ((event.target as Element).closest('a')) {
          return;
        }
        router.push(`/drug/${params.row.RXAUI}`);
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
