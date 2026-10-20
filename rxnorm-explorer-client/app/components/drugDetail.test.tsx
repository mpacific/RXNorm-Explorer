import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DrugDetail from './drugDetail';
import { Drug } from '../../../rxnorm-explorer-server/types/drug';
import { RelatedDrug } from '../../../rxnorm-explorer-server/types/relatedDrugs';

const related = (
  r_id: number,
  r_RELA: string,
  c1: [number, string, string, string],
  c2: [number, string, string, string]
): RelatedDrug => ({
  r_id,
  r_RELA,
  r_RXCUI1: c1[1],
  r_RXCUI2: c2[1],
  c1_id: c1[0],
  c1_RXCUI: c1[1],
  c1_TTY: c1[2],
  c1_STR: c1[3],
  c2_id: c2[0],
  c2_RXCUI: c2[1],
  c2_TTY: c2[2],
  c2_STR: c2[3],
});

const acetaminophen: [number, string, string, string] = [
  127,
  '161',
  'IN',
  'acetaminophen',
];
const tablet: [number, string, string, string] = [
  500,
  '313782',
  'SCD',
  'acetaminophen 325 MG Oral Tablet',
];
const tylenol: [number, string, string, string] = [
  600,
  '202433',
  'BN',
  'Tylenol',
];

const drug = (overrides: Partial<Drug> = {}): Drug => ({
  id: 127,
  RXAUI: '1234567',
  RXCUI: '161',
  TTY: 'IN',
  STR: 'acetaminophen',
  ATV: '00001, 00002',
  RelatedDrugs: [
    related(1, 'has_ingredient', tablet, acetaminophen),
    related(2, 'has_tradename', acetaminophen, tylenol),
    related(3, 'some_new_rela', acetaminophen, tylenol),
  ],
  ...overrides,
});

describe('DrugDetail', () => {
  const factsRow = () =>
    within(screen.getAllByRole('table')[0]).getAllByRole('row')[1];
  const relatedRows = () => screen.getAllByRole('row').slice(3); // facts header + row, grid header

  it('names the drug', () => {
    render(<DrugDetail drug={drug()} />);

    expect(
      screen.getByRole('heading', { name: 'acetaminophen' })
    ).toBeInTheDocument();
  });

  it('lists its RXCUI, linked to a search for it, and its TTY', () => {
    render(<DrugDetail drug={drug()} />);

    const facts = within(factsRow());
    expect(facts.getByRole('link', { name: '161' })).toHaveAttribute(
      'href',
      '/search?search=161'
    );
    expect(facts.getByText('IN')).toBeInTheDocument();
  });

  it('lists its NDCs', () => {
    render(<DrugDetail drug={drug({ ATV: '00001,00002,00003' })} />);

    expect(
      within(factsRow()).getByText('00001, 00002, 00003')
    ).toBeInTheDocument();
  });

  it('says so when it has no NDCs', () => {
    render(<DrugDetail drug={drug({ ATV: '' })} />);

    expect(within(factsRow()).getByText('None')).toBeInTheDocument();
  });

  it('shows a row per relationship with both drugs and their types', () => {
    render(<DrugDetail drug={drug()} />);

    expect(relatedRows()).toHaveLength(3);
    const first = within(relatedRows()[0]);
    expect(
      first.getByText('acetaminophen 325 MG Oral Tablet (SCD)')
    ).toBeInTheDocument();
    expect(first.getByText('has ingredient')).toBeInTheDocument();
    expect(first.getByText('acetaminophen (IN)')).toBeInTheDocument();
  });

  it('links to the other drug but not to this one', () => {
    render(<DrugDetail drug={drug()} />);

    const first = within(relatedRows()[0]);
    expect(
      first.getByRole('link', {
        name: 'acetaminophen 325 MG Oral Tablet (SCD)',
      })
    ).toHaveAttribute('href', '/drug/500');
    expect(
      first.queryByRole('link', { name: 'acetaminophen (IN)' })
    ).not.toBeInTheDocument();
  });

  it('puts relationships into words, and shows ones it does not know as they are', () => {
    render(<DrugDetail drug={drug()} />);

    expect(
      within(relatedRows()[1]).getByText('is the trade name of')
    ).toBeInTheDocument();
    expect(
      within(relatedRows()[2]).getByText('some_new_rela')
    ).toBeInTheDocument();
  });

  it.each([
    ['isa', 'is an instance of'],
    ['has_dose_form', 'has dose form'],
    ['consists_of', 'consists of'],
    ['constitutes', 'constitutes'],
    ['has_precise_ingredient', 'has precise ingredient'],
    ['has_doseformgroup', 'has dose form group'],
    ['has_ingredients', 'has ingredients'],
    ['has_part', 'has part'],
    ['has_boss', 'has basis of strength substance'],
    ['has_form', 'has form'],
  ])('describes %s as "%s"', (rela, description) => {
    render(
      <DrugDetail
        drug={drug({ RelatedDrugs: [related(1, rela, acetaminophen, tablet)] })}
      />
    );

    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('shows an empty grid when there are no related drugs', () => {
    render(<DrugDetail drug={drug({ RelatedDrugs: undefined })} />);

    expect(screen.getByText('No rows')).toBeInTheDocument();
  });
});
