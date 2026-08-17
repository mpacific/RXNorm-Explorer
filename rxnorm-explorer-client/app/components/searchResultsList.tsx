import { DataGrid, GridRowParams } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SearchResultsList(props: {
  searchResults: {
    id: number;
    RXCUI: string;
    TTY: string;
    STR: string;
  }[];
  totalCount?: number;
  loading: boolean;
  setCursor: (cursor: number) => void;
}) {
  const router = useRouter();
  const [paginationModel, setPagionationModel] = useState({
    page: 0,
    pageSize: 50,
  });
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

  const rows: {
    id: number;
    RXCUI: string;
    TTY: string;
    STR: string;
  }[] = [];
  for (let i = 0; i < props.searchResults.length; i++) {
    rows.push({
      id: Number(props.searchResults[i].id),
      RXCUI: props.searchResults[i].RXCUI,
      TTY: props.searchResults[i].TTY,
      STR: props.searchResults[i].STR,
    });
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
      onPaginationModelChange={handlePaginationModelChange}
      loading={props.loading}
    />
  );
}
