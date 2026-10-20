import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchBox from './searchBox';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('SearchBox', () => {
  beforeEach(() => {
    push.mockReset();
  });

  const input = () =>
    screen.getByRole('textbox', { name: 'Search by drug name, RXCUI, or NDC' });

  it('starts with the current search term', () => {
    render(<SearchBox searchTerm="acetaminophen" />);

    expect(input()).toHaveValue('acetaminophen');
    expect(screen.getByText('Hit enter to submit search')).toBeInTheDocument();
  });

  it('searches when Enter is pressed', async () => {
    render(<SearchBox searchTerm="" />);

    await userEvent.type(input(), 'ibuprofen{Enter}');

    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/search?search=ibuprofen', {
      scroll: false,
    });
  });

  it('does not search while typing', async () => {
    render(<SearchBox searchTerm="" />);

    await userEvent.type(input(), 'ibuprofen');

    expect(push).not.toHaveBeenCalled();
  });

  it('replaces the current term rather than adding to the URL', async () => {
    render(<SearchBox searchTerm="aspirin" />);

    await userEvent.clear(input());
    await userEvent.type(input(), '161{Enter}');

    expect(push).toHaveBeenCalledWith('/search?search=161', { scroll: false });
  });

  it('encodes characters that mean something in a URL', async () => {
    render(<SearchBox searchTerm="" />);

    await userEvent.type(input(), 'a&b=c 100%{Enter}');

    expect(push).toHaveBeenCalledWith('/search?search=a%26b%3Dc+100%25', {
      scroll: false,
    });
  });

  it('sends an empty search as an empty term', async () => {
    render(<SearchBox searchTerm="" />);

    await userEvent.type(input(), '{Enter}');

    expect(push).toHaveBeenCalledWith('/search?search=', { scroll: false });
  });
});
