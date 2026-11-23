import {
  Button,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Drug } from '../../../rxnorm-explorer-server/src/types/drug';
import Link from 'next/link';
import { RelatedDrug } from '../../../rxnorm-explorer-server/src/types/relatedDrugs';
import { ReactElement, useState } from 'react';
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
  pageRxaui: string,
  linkRxaui: string,
  linkDrugName: string,
  linkDrugTty: string
): ReactElement => {
  if (pageRxaui === linkRxaui) {
    return (
      <span>
        {linkDrugName} ({linkDrugTty})
      </span>
    );
  }
  return (
    <Link href={'/drug/' + linkRxaui}>
      {linkDrugName} ({linkDrugTty})
    </Link>
  );
};

// Some atoms have thousands of NDCs (one has 3,558), so only the first few
// are shown until asked for the rest.
export const NDC_PREVIEW_COUNT = 20;

function NdcList(props: { NDCs: string[] }) {
  const [showAll, setShowAll] = useState(false);

  if (props.NDCs.length === 0) {
    return <>None</>;
  }

  const hidden = props.NDCs.length - NDC_PREVIEW_COUNT;
  const shown =
    showAll || hidden <= 0
      ? props.NDCs
      : props.NDCs.slice(0, NDC_PREVIEW_COUNT);

  return (
    <>
      {shown.join(', ')}
      {hidden > 0 && (
        <div>
          <Button size="small" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `Show all ${props.NDCs.length} NDCs`}
          </Button>
        </div>
      )}
    </>
  );
}

type DetailRelatedDrug = {
  id: string;
  c1_name: ReactElement;
  relationship: string;
  c2_name: ReactElement;
};

export default function DrugDetail(props: { drug: Drug }) {
  const rows: DetailRelatedDrug[] = [];
  props.drug?.RelatedDrugs?.map((drug: RelatedDrug): void => {
    rows.push({
      id: drug.c1_RXAUI + '-' + drug.c2_RXAUI + '-' + drug.r_id,
      c1_name: linkDrug(
        props.drug.RXAUI,
        drug.c1_RXAUI,
        drug.c1_STR,
        drug.c1_TTY
      ),
      relationship: translateRELA(drug.r_RELA),
      c2_name: linkDrug(
        props.drug.RXAUI,
        drug.c2_RXAUI,
        drug.c2_STR,
        drug.c2_TTY
      ),
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
              <TableCell>
                <NdcList NDCs={props.drug.NDCs} />
              </TableCell>
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
              renderCell: (params: GridRenderCellParams<DetailRelatedDrug>) =>
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
              renderCell: (params: GridRenderCellParams<DetailRelatedDrug>) =>
                params.row.c2_name,
            },
          ]}
          rows={rows}
        />
      </div>
    </Container>
  );
}
