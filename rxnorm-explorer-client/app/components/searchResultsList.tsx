import {
  DataGrid,
  GridRowParams,
  GridSortDirection,
  GridSortModel,
} from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Drug } from '../../types/drug';

export default function SearchResultsList(props: {
  searchResults: Drug[] | undefined;
  totalCount?: number;
  loading: boolean;
  sortField: string;
  sortDirection: string;
  setCursor: (cursor: number) => void;
  setSortField: (sortField: string) => void;
  setSortDirection: (sortDirection: string) => void;
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
  const [pageCursor, setPageCursor] = useState<Record<string, number>>({});

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

  const rows: Drug[] = [];
  for (let i = 0; i < (props.searchResults?.length || 1); i++) {
    if (props.searchResults?.[i]) {
      rows.push({
        id: Number(props.searchResults[i].id),
        RXCUI: props.searchResults[i].RXCUI,
        TTY: props.searchResults[i].TTY,
        STR: props.searchResults[i].STR,
      });
    }
  }

  const handlePaginationModelChange = (newPaginationModel: {
    page: number;
    pageSize: number;
  }) => {
    if (newPaginationModel.page < paginationModel.page) {
      props.setCursor(pageCursor[newPaginationModel.page]);
    } else {
      const lastRowId = rows?.[rows.length - 1]?.id;
      props.setCursor(lastRowId);

      const pageCursors = pageCursor;
      pageCursors[newPaginationModel.page] = lastRowId;
      setPageCursor(pageCursors);
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
    props.setSortField(newSortingModel[0].field!);
    props.setSortDirection(newSortingModel[0].sort!);
    setSortingModel(newSortingModel);
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
