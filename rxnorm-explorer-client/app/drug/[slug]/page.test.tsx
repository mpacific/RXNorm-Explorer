import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DrugDetailPage from './page';
import { Drug } from '../../../../rxnorm-explorer-server/types/drug';
import {
  deferredResponse,
  jsonResponse,
  requestedUrl,
  stubFetch,
} from '@/test-utils/fetch';

let slug = '127';
vi.mock('next/navigation', () => ({ useParams: () => ({ slug }) }));

const drug = (id: number, STR: string): Drug => ({
  id,
  RXAUI: `A${id}`,
  RXCUI: String(1000 + id),
  TTY: 'SCD',
  STR,
  ATV: '',
  RelatedDrugs: [],
});

describe('DrugDetailPage', () => {
  let fetch: ReturnType<typeof stubFetch>;

  beforeEach(() => {
    slug = '127';
    fetch = stubFetch();
  });

  it('loads the drug named in the URL', async () => {
    fetch.mockImplementation(async () => jsonResponse(drug(127, 'Tylenol')));

    render(<DrugDetailPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Tylenol' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(requestedUrl(fetch).href).toBe('http://api.test/drug/127');
  });

  it('shows an error when the drug cannot be loaded', async () => {
    fetch.mockImplementation(
      async () => new Response('{}', { status: 404, statusText: 'Not Found' })
    );

    render(<DrugDetailPage />);

    expect(
      await screen.findByText(/Load drug error: Not Found/)
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('shows an error when the server cannot be reached', async () => {
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<DrugDetailPage />);

    expect(await screen.findByText(/Failed to fetch/)).toBeInTheDocument();
  });

  it('asks for a slug that is not a number as NaN', async () => {
    slug = 'tylenol';
    fetch.mockImplementation(
      async () => new Response('{}', { status: 404, statusText: 'Not Found' })
    );

    render(<DrugDetailPage />);

    await screen.findByText(/Load drug error/);
    expect(requestedUrl(fetch).pathname).toBe('/drug/NaN');
  });

  describe('moving from one drug to another', () => {
    it('shows loading, not the previous drug, while the next one loads', async () => {
      const next = deferredResponse();
      fetch
        .mockImplementationOnce(async () => jsonResponse(drug(127, 'Tylenol')))
        .mockReturnValueOnce(next.promise);
      const { rerender } = render(<DrugDetailPage />);
      await screen.findByRole('heading', { name: 'Tylenol' });

      slug = '500';
      rerender(<DrugDetailPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Tylenol' })
      ).not.toBeInTheDocument();

      await act(async () => next.respond(drug(500, 'Advil')));
      expect(
        screen.getByRole('heading', { name: 'Advil' })
      ).toBeInTheDocument();
    });

    it('ignores the previous drug if it arrives late', async () => {
      const first = deferredResponse();
      const second = deferredResponse();
      fetch
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      const { rerender } = render(<DrugDetailPage />);

      slug = '500';
      rerender(<DrugDetailPage />);
      await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

      await act(async () => second.respond(drug(500, 'Advil')));
      await act(async () => first.respond(drug(127, 'Tylenol')));

      expect(
        screen.getByRole('heading', { name: 'Advil' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('heading', { name: 'Tylenol' })
      ).not.toBeInTheDocument();
    });

    it("ignores the previous drug's error if it arrives late", async () => {
      const first = deferredResponse();
      fetch
        .mockReturnValueOnce(first.promise)
        .mockImplementationOnce(async () => jsonResponse(drug(500, 'Advil')));
      const { rerender } = render(<DrugDetailPage />);

      slug = '500';
      rerender(<DrugDetailPage />);
      await screen.findByRole('heading', { name: 'Advil' });

      await act(async () => first.fail(new Error('network down')));

      expect(screen.queryByText(/network down/)).not.toBeInTheDocument();
    });
  });
});
