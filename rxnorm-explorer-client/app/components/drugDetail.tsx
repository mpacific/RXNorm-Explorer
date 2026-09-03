import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Drug } from '../../../rxnorm-explorer-server/types/drug';
import Link from 'next/link';
import { RelatedDrug } from '../../../rxnorm-explorer-server/types/relatedDrugs';
import { ReactElement } from 'react';
import { DataGrid, GridRenderCellParams } from '@mui/x-data-grid';

const translateRELA = (RELA: string): string => {
  const relaMap: Record<string, string> = {
    isa: 'is an instance of',
    has_ingredient: 'has ingredient',
    has_dose_form: 'has dose form',
    consists_of: 'consists of',
    has_tradename: 'is the trade name of',
    constitutes: 'constitutes',
    has_precise_ingredient: 'has precise ingredient',
    has_doseformgroup: 'has dose form group',
    has_ingredients: 'has ingredients',
    has_part: 'has part',
    has_boss: 'has basis of strength substance',
    has_form: 'has form',
  };

  return relaMap[RELA] ? relaMap[RELA] : RELA;
};

const linkDrug = (
  pageDrugId: number,
  linkDrugId: number,
  linkDrugName: string,
  linkDrugTty: string
): ReactElement => {
  if (Number(pageDrugId) === Number(linkDrugId)) {
    return (
      <span>
        {linkDrugName} ({linkDrugTty})
      </span>
    );
  }
  return (
    <Link href={'/drug/' + linkDrugId}>
      {linkDrugName} ({linkDrugTty})
    </Link>
  );
};

type DetailRelatedDrug = {
  id: string;
  c1_name: ReactElement;
  relationship: string;
  c2_name: ReactElement;
};

export default function DrugDetail(props: { drug: Drug }) {
  const ndcArray = props.drug?.ATV?.split(',');

  const rows: DetailRelatedDrug[] = [];
  props.drug?.RelatedDrugs?.map((drug: RelatedDrug): void => {
    rows.push({
      id: drug.c1_id + '-' + drug.c2_id + '-' + drug.r_id,
      c1_name: linkDrug(props.drug.id, drug.c1_id, drug.c1_STR, drug.c1_TTY),
      relationship: translateRELA(drug.r_RELA),
      c2_name: linkDrug(props.drug.id, drug.c2_id, drug.c2_STR, drug.c2_TTY),
    });
  });

  return (
    <Container>
      <Typography variant="h5" gutterBottom>
        {props.drug.STR}
      </Typography>
      <Typography variant="h6">Drug Facts</Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>RXCUI</TableCell>
              <TableCell>TTY</TableCell>
              <TableCell>NDCs</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell
                style={{
                  verticalAlign: 'top',
                }}
              >
                <Link href={'/search?search=' + props.drug.RXCUI}>
                  {props.drug.RXCUI}
                </Link>
              </TableCell>
              <TableCell
                style={{
                  verticalAlign: 'top',
                }}
              >
                {props.drug.TTY}
              </TableCell>
              <TableCell>{ndcArray?.join(', ') || 'None'}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
      <Typography
        variant="h6"
        style={{
          marginTop: '2em',
        }}
        gutterBottom
      >
        Related Drugs
      </Typography>
      <div
        style={{
          height: '400px',
        }}
      >
        <DataGrid
          columns={[
            {
              field: 'c1_name',
              headerName: 'Drug 1',
              flex: 1,
              sortable: false,
              disableColumnMenu: true,
              renderCell: (params: GridRenderCellParams<any>) =>
                params.row.c1_name,
            },
            {
              field: 'relationship',
              headerName: 'Relationship',
              flex: 1,
            },
            {
              field: 'c2_name',
              headerName: 'Drug 2',
              flex: 1,
              sortable: false,
              disableColumnMenu: true,
              renderCell: (params: GridRenderCellParams<any>) =>
                params.row.c2_name,
            },
          ]}
          rows={rows}
        />
      </div>
    </Container>
  );
}
