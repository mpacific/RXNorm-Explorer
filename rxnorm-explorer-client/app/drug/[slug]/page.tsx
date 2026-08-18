'use client';
import LoadingMessage from '@/app/components/loading';
import ErrorMessage from '@/app/components/error';
import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { useParams } from 'next/navigation';
import NotFoundMessage from '@/app/components/notFound';
import DrugDetail from '@/app/components/drugDetail';
import { Drug } from '../../../../types/drug';

const getRXNCONSOString = gql`
  query getRXNCONSO($id: Int!) {
    getRXNCONSO(id: $id) {
      id
      RXCUI
      TTY
      STR
      RXNSAT {
        ATV
        RXNCONSO {
          id
          RXCUI
          TTY
          STR
        }
      }
      RelatedDrugs {
        r_RELA
        c1_id
        c1_RXCUI
        c1_TTY
        c1_STR
        c2_id
        c2_RXCUI
        c2_TTY
        c2_STR
      }
    }
  }
`;

export default function DrugDetailPage() {
  const params = useParams();
  const drugId = Number(params.slug);

  const {
    loading,
    error,
    data,
  }: {
    loading?: boolean;
    error?: Error;
    data?: {
      getRXNCONSO: Drug;
    };
  } = useQuery(getRXNCONSOString, {
    variables: {
      id: drugId,
    },
  });

  return (
    <div>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage searchError={error.message} />}
      {!loading && !error && !data && <NotFoundMessage />}
      {!loading && !error && data && <DrugDetail drug={data.getRXNCONSO} />}
    </div>
  );

  return <div>{drugId}!</div>;
}
