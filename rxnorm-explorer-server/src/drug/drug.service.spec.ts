import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DrugService } from './drug.service';
import { RXNCONSO } from '../db/entities/RXNCONSO.entity';
import { RXNREL } from '../db/entities/RXNREL.entity';
import { RXNSAT } from '../db/entities/RXNSAT.entity';
import { EXCLUDED_TTYS } from '../shared/excludedTtys';
import {
  createMockQueryBuilder,
  MockQueryBuilder,
} from '../test-utils/testing';

describe('DrugService', () => {
  let service: DrugService;
  let drugQuery: MockQueryBuilder;
  let ndcQuery: MockQueryBuilder;
  let relatedQuery: MockQueryBuilder;

  const drugRow = {
    RXAUI: '1234567',
    RXCUI: '161',
    TTY: 'IN',
    STR: 'acetaminophen',
  };
  const relatedRows = [
    {
      r_id: 1,
      r_RELA: 'has_ingredient',
      r_RXCUI1: '161',
      r_RXCUI2: '313782',
      c1_RXAUI: '1234567',
      c1_RXCUI: '161',
      c1_TTY: 'IN',
      c1_STR: 'acetaminophen',
      c2_RXAUI: '7654321',
      c2_RXCUI: '313782',
      c2_TTY: 'SCD',
      c2_STR: 'acetaminophen 325 MG Oral Tablet',
    },
  ];

  beforeEach(async () => {
    drugQuery = createMockQueryBuilder();
    ndcQuery = createMockQueryBuilder();
    relatedQuery = createMockQueryBuilder();

    drugQuery.getRawOne.mockResolvedValue({ ...drugRow });
    ndcQuery.getRawMany.mockResolvedValue([{ ATV: '00001' }, { ATV: '00002' }]);
    relatedQuery.getRawMany.mockResolvedValue(relatedRows);

    const repository = (qb: MockQueryBuilder) => ({
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DrugService,
        {
          provide: getRepositoryToken(RXNCONSO),
          useValue: repository(drugQuery),
        },
        { provide: getRepositoryToken(RXNSAT), useValue: repository(ndcQuery) },
        {
          provide: getRepositoryToken(RXNREL),
          useValue: repository(relatedQuery),
        },
      ],
    }).compile();

    service = module.get<DrugService>(DrugService);
  });

  it('returns null and looks nothing else up when there is no such drug', async () => {
    drugQuery.getRawOne.mockResolvedValue(undefined);

    await expect(service.getDrug('999')).resolves.toBeNull();

    expect(ndcQuery.getRawMany).not.toHaveBeenCalled();
    expect(relatedQuery.getRawMany).not.toHaveBeenCalled();
  });

  it('looks the drug up by RXAUI', async () => {
    await service.getDrug('1234567');

    expect(drugQuery.select).toHaveBeenCalledWith([
      'rxnconso.RXAUI AS RXAUI',
      'rxnconso.RXCUI AS RXCUI',
      'rxnconso.TTY AS TTY',
      'rxnconso.STR AS STR',
    ]);
    expect(drugQuery.where).toHaveBeenCalledWith('rxnconso.RXAUI = :rxaui', {
      rxaui: '1234567',
    });
  });

  it('returns the drug with its NDCs and related drugs', async () => {
    await expect(service.getDrug('1234567')).resolves.toEqual({
      ...drugRow,
      NDCs: ['00001', '00002'],
      RelatedDrugs: relatedRows,
    });
  });

  it("looks NDCs up by the drug's atom", async () => {
    await service.getDrug('1234567');

    expect(ndcQuery.select).toHaveBeenCalledWith(['rxnsat.ATV AS ATV']);
    expect(ndcQuery.where).toHaveBeenCalledWith(
      'rxnsat.RXAUI = :drugAUI AND rxnsat.ATN = :ndc',
      { drugAUI: '1234567', ndc: 'NDC' },
    );
  });

  it('gives an empty NDC list when the drug has none', async () => {
    ndcQuery.getRawMany.mockResolvedValue([]);

    const drug = await service.getDrug('1234567');

    expect(drug?.NDCs).toEqual([]);
  });

  it('finds relationships on either side of the concept', async () => {
    await service.getDrug('1234567');

    expect(relatedQuery.andWhere).toHaveBeenCalledWith(
      '(r.RXCUI1 = :RXCUI OR r.RXCUI2 = :RXCUI)',
      { RXCUI: '161' },
    );
    expect(relatedQuery.innerJoin).toHaveBeenCalledWith(
      'RXNCONSO',
      'c1',
      'r.RXCUI1 = c1.RXCUI',
    );
    expect(relatedQuery.innerJoin).toHaveBeenCalledWith(
      'RXNCONSO',
      'c2',
      'r.RXCUI2 = c2.RXCUI',
    );
  });

  it('leaves out inverse relationships and excluded term types on both sides', async () => {
    await service.getDrug('1234567');

    expect(relatedQuery.where).toHaveBeenCalledWith('r.RELA IS NOT NULL');
    expect(relatedQuery.andWhere).toHaveBeenCalledWith(
      'r.RELA NOT IN (:...inverseRelas)',
      {
        inverseRelas: expect.arrayContaining([
          'inverse_isa',
          'ingredient_of',
          'tradename_of',
        ]),
      },
    );
    expect(relatedQuery.andWhere).toHaveBeenCalledWith(
      'c1.TTY NOT IN (:excludeTtys)',
      { excludeTtys: EXCLUDED_TTYS },
    );
    expect(relatedQuery.andWhere).toHaveBeenCalledWith(
      'c2.TTY NOT IN (:excludeTtys)',
      { excludeTtys: EXCLUDED_TTYS },
    );
  });

  it('orders related drugs by concept', async () => {
    await service.getDrug('1234567');

    expect(relatedQuery.orderBy).toHaveBeenCalledWith('r.RXCUI1', 'ASC');
    expect(relatedQuery.addOrderBy).toHaveBeenCalledWith('r.RXCUI2', 'ASC');
  });

  it('looks up NDCs and related drugs at the same time', async () => {
    // Hold the NDC query open; the related-drugs query must start anyway
    let finishNdcs!: (rows: { ATV: string }[]) => void;
    ndcQuery.getRawMany.mockReturnValue(
      new Promise((resolve) => {
        finishNdcs = resolve;
      }),
    );

    const pending = service.getDrug('1234567');
    await new Promise(process.nextTick);

    expect(relatedQuery.getRawMany).toHaveBeenCalled();
    finishNdcs([]);
    await expect(pending).resolves.toMatchObject({ NDCs: [] });
  });
});
