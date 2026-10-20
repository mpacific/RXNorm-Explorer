import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ErrorMessage from './error';
import LoadingMessage from './loading';
import NoSearchTerm from './noSearchTerm';

describe('ErrorMessage', () => {
  it('labels the error and shows its message', () => {
    render(<ErrorMessage searchError="Search results error: Bad Request" />);

    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(
      screen.getByText(/Search results error: Bad Request/)
    ).toBeInTheDocument();
  });

  it('shows markup in a message as text', () => {
    render(<ErrorMessage searchError="<img src=x onerror=alert(1)>" />);

    expect(screen.getByText(/<img src=x/)).toBeInTheDocument();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('LoadingMessage', () => {
  it('says it is loading', () => {
    render(<LoadingMessage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('NoSearchTerm', () => {
  it('says there is nothing to search for', () => {
    render(<NoSearchTerm />);

    expect(screen.getByText('No search term provided')).toBeInTheDocument();
  });
});
