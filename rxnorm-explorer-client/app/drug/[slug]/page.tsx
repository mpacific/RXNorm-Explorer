'use client';
import LoadingMessage from '@/app/components/loading';
import ErrorMessage from '@/app/components/error';
import { useParams } from 'next/navigation';
import DrugDetail from '@/app/components/drugDetail';
import { Drug } from '../../../../rxnorm-explorer-server/types/drug';
import { useEffect, useState } from 'react';

const getDrug = async (drugId: number): Promise<Drug | null> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/drug/${drugId}`
  );

  if (!response.ok) {
    throw new Error(`Load drug error: ${response.statusText}`);
  }

  return response.json();
};

export default function DrugDetailPage() {
  const params = useParams();
  const drugId = Number(params.slug);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [drug, setDrug] = useState<Drug | null>(null);

  useEffect(() => {
    setLoading(true);

    getDrug(drugId)
      .then((data) => {
        setDrug(data);
      })
      .catch((error) => {
        setError(error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [drugId]);

  return (
    <div>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage searchError={error.message} />}
      {!loading && !error && drug && <DrugDetail drug={drug} />}
    </div>
  );
}
