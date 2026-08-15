import { DataGrid, GridRowParams } from '@mui/x-data-grid';
import { useRouter } from 'next/navigation';

export default function SearchResultsList(props: {
  searchResults: {
    id: number;
    RXCUI: string;
    TTY: string;
    STR: string;
  }[];
}) {
  const router = useRouter();

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

  const rows = [];
  for (let i = 0; i < props.searchResults.length; i++) {
    rows.push({
      id: props.searchResults[i].id,
      RXCUI: props.searchResults[i].RXCUI,
      TTY: props.searchResults[i].TTY,
      STR: props.searchResults[i].STR,
    });
  }

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      onRowClick={(params: GridRowParams) => {
        router.push(`/drug/${params.id}`);
      }}
      rowSelection={false}
      disableColumnMenu={true}
    />
  );
}
