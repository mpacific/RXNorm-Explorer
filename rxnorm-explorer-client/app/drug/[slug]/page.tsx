'use client';
import LoadingMessage from '@/app/components/loading';
import ErrorMessage from '@/app/components/error';
import { useParams } from 'next/navigation';
import DrugDetail from '@/app/components/drugDetail';
import { Drug } from '../../../../rxnorm-explorer-server/src/types/drug';
import { useEffect, useState } from 'react';

// The slug is the drug's RXAUI, which stays the same across RxNorm releases
const getDrug = async (rxaui: string): Promise<Drug | null> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/drug/${encodeURIComponent(rxaui)}`
  );

  if (!response.ok) {
    throw new Error(`Load drug error: ${response.statusText}`);
  }

  return response.json();
};

type DrugResponse = {
  slug: string;
  drug?: Drug | null;
  error?: string;
};

export default function DrugDetailPage() {
  const slug = String(useParams().slug);
  const [response, setResponse] = useState<DrugResponse | null>(null);

  useEffect(() => {
    // Linking from one drug to another reuses this component, so a slow
    // response for the previous drug must not overwrite the new one.
    let ignore = false;

    getDrug(slug)
      .then((drug) => {
        if (!ignore) {
          setResponse({ slug, drug });
        }
      })
      .catch((error) => {
        if (!ignore) {
          setResponse({ slug, error: error.message });
        }
      });

    return () => {
      ignore = true;
    };
  }, [slug]);

  // Loading until there's a response for this drug. Derived rather than set
  // when the request starts, which also drops the previous drug's error.
  const current = response?.slug === slug ? response : null;

  return (
    <div>
      {!current && <LoadingMessage />}
      {current?.error && <ErrorMessage searchError={current.error} />}
      {current?.drug && <DrugDetail drug={current.drug} />}
    </div>
  );
}
