'use client';
import LoadingMessage from '@/app/components/loading';
import ErrorMessage from '@/app/components/error';
import { useParams } from 'next/navigation';
import DrugDetail from '@/app/components/drugDetail';
import { Drug } from '../../../types/drug';

export default function DrugDetailPage() {
  const params = useParams();
  const drugId = Number(params.slug);
  const loading = false;
  const error: {
    message: string;
  } = {
    message: '',
  };
  const data = {
    getRXNCONSO: null,
  };

  return (
    <div>
      {loading && <LoadingMessage />}
      {error && <ErrorMessage searchError={error.message} />}
      {!loading && !error && data && <DrugDetail drug={data.getRXNCONSO} />}
    </div>
  );
}
