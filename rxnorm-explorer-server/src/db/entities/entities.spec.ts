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

  // Index name -> its columns and whether it's unique
  const indices = (target: EntityClass) =>
    Object.fromEntries(
      storage
        .filterIndices(target)
        .map((index) => [
          index.name,
          { columns: index.columns as string[], unique: index.unique ?? false },
        ]),
    );

  const length = (target: EntityClass, property: string) =>
    storage.filterColumns(target).find((c) => c.propertyName === property)
      ?.options.length;

  it.each([
    [RXNCONSO, 'RXNCONSO'],
    [RXNREL, 'RXNREL'],
    [RXNSAT, 'RXNSAT'],
  ])('maps %p to the %s table with a generated id', (target, table) => {
    // Named explicitly: TypeORM would otherwise lower-case the class name,
    // which only works on servers with case-insensitive table names
    expect(storage.tables.find((t) => t.target === target)?.name).toBe(table);
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
    // Named as migration 1789068330590 creates them; STR has no index since
    // migration 1790709373981 dropped both
    expect(indices(RXNCONSO)).toEqual({
      RXNCONSO_RXAUI_key: { columns: ['RXAUI'], unique: true },
      RXNCONSO_RXCUI_idx: { columns: ['RXCUI'], unique: false },
      RXNCONSO_TTY_idx: { columns: ['TTY'], unique: false },
    });
    expect(length(RXNCONSO, 'STR')).toBe(3000);
    expect(length(RXNCONSO, 'RXAUI')).toBe(8);
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
    expect(indices(RXNREL)).toEqual({
      RXNREL_RXCUI1_idx: { columns: ['RXCUI1'], unique: false },
      RXNREL_RXCUI2_idx: { columns: ['RXCUI2'], unique: false },
    });
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
    expect(indices(RXNSAT)).toEqual({
      RXNSAT_RXAUI_idx: { columns: ['RXAUI'], unique: false },
      RXNSAT_ATN_idx: { columns: ['ATN'], unique: false },
      RXNSAT_ATV_idx: { columns: ['ATV'], unique: false },
    });
    // ATN(100) and ATV(100) are prefix indexes, which TypeORM must not
    // try to rebuild as full-column ones
    expect(
      storage
        .filterIndices(RXNSAT)
        .filter((index) => index.synchronize === false)
        .map((index) => index.name),
    ).toEqual(['RXNSAT_ATN_idx', 'RXNSAT_ATV_idx']);
    expect(length(RXNSAT, 'ATN')).toBe(1000);
    expect(length(RXNSAT, 'ATV')).toBe(4000);
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
    ).toMatchObject({
      name: 'RXAUI',
      referencedColumnName: 'RXAUI',
      foreignKeyConstraintName: 'RXNSAT_RXAUI_fkey',
    });
  });
});
