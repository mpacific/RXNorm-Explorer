import { getMetadataArgsStorage } from 'typeorm';
import { RXNCONSO } from './RXNCONSO.entity';
import { RXNREL } from './RXNREL.entity';
import { RXNSAT } from './RXNSAT.entity';

// The tables come from NLM's load scripts, not from these classes
// (synchronize is off), so these check that the mappings the queries rely on
// line up with that schema.
describe('entities', () => {
  const storage = getMetadataArgsStorage();

  // A class, as TypeORM's metadata storage keys on it
  type EntityClass = new () => object;

  const columns = (target: EntityClass) =>
    storage.filterColumns(target).map((column) => column.propertyName);

  const indexed = (target: EntityClass) =>
    storage.filterIndices(target).flatMap((index) => index.columns as string[]);

  it.each([
    [RXNCONSO, 'RXNCONSO'],
    [RXNREL, 'RXNREL'],
    [RXNSAT, 'RXNSAT'],
  ])('maps %p to the %s table with a generated id', (target, table) => {
    // No explicit table name, so TypeORM uses the class name
    expect(
      storage.tables.find((t) => t.target === target)?.name,
    ).toBeUndefined();
    expect(target.name).toBe(table);
    expect(
      storage.generations.find(
        (generation) =>
          generation.target === target && generation.propertyName === 'id',
      )?.strategy,
    ).toBe('increment');
  });

  it('maps the RRF columns of RXNCONSO', () => {
    expect(columns(RXNCONSO)).toEqual([
      'id',
      'RXCUI',
      'LAT',
      'TS',
      'LUI',
      'STT',
      'SUI',
      'ISPREF',
      'RXAUI',
      'SAUI',
      'SCUI',
      'SDUI',
      'SAB',
      'TTY',
      'CODE',
      'STR',
      'SRL',
      'SUPPRESS',
      'CVF',
    ]);
    expect(
      storage.filterColumns(RXNCONSO).find((c) => c.propertyName === 'RXAUI')
        ?.options.unique,
    ).toBe(true);
    expect(indexed(RXNCONSO)).toEqual(expect.arrayContaining(['RXCUI', 'TTY']));
  });

  it('maps the RRF columns of RXNREL', () => {
    expect(columns(RXNREL)).toEqual([
      'id',
      'RXCUI1',
      'RXAUI1',
      'STYPE1',
      'REL',
      'RXCUI2',
      'RXAUI2',
      'STYPE2',
      'RELA',
      'RUI',
      'SRUI',
      'SAB',
      'SL',
      'DIR',
      'RG',
      'SUPPRESS',
      'CVF',
    ]);
    expect(indexed(RXNREL)).toEqual(
      expect.arrayContaining(['RXCUI1', 'RXCUI2']),
    );
  });

  it('maps the RRF columns of RXNSAT', () => {
    expect(columns(RXNSAT)).toEqual([
      'id',
      'RXCUI',
      'LUI',
      'SUI',
      'RXAUI',
      'STYPE',
      'CODE',
      'ATUI',
      'SATUI',
      'ATN',
      'SAB',
      'ATV',
      'SUPPRESS',
      'CVF',
    ]);
    expect(indexed(RXNSAT)).toEqual(
      expect.arrayContaining(['RXAUI', 'ATN', 'ATV']),
    );
  });

  it('relates attributes to their atom by RXAUI, in both directions', () => {
    const toAtom = storage.relations.find(
      (relation) =>
        relation.target === RXNSAT && relation.propertyName === 'RXNCONSO',
    )!;
    const toAttributes = storage.relations.find(
      (relation) =>
        relation.target === RXNCONSO && relation.propertyName === 'RXNSAT',
    )!;

    expect(toAtom.relationType).toBe('many-to-one');
    expect(toAttributes.relationType).toBe('one-to-many');
    expect((toAtom.type as () => unknown)()).toBe(RXNCONSO);
    expect((toAttributes.type as () => unknown)()).toBe(RXNSAT);

    // Each side names the property on the other that points back
    const atom = { RXNSAT: ['attributes'] } as unknown as RXNCONSO;
    const attribute = { RXNCONSO: 'atom' } as unknown as RXNSAT;
    expect(
      (toAtom.inverseSideProperty as (a: RXNCONSO) => unknown)(atom),
    ).toEqual(['attributes']);
    expect(
      (toAttributes.inverseSideProperty as (s: RXNSAT) => unknown)(attribute),
    ).toBe('atom');

    expect(
      storage.joinColumns.find(
        (join) => join.target === RXNSAT && join.propertyName === 'RXNCONSO',
      ),
    ).toMatchObject({ name: 'RXAUI', referencedColumnName: 'RXAUI' });
  });
});
