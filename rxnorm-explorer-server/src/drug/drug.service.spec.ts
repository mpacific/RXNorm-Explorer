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
    id: 127,
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
      c1_id: 127,
      c1_RXCUI: '161',
      c1_TTY: 'IN',
      c1_STR: 'acetaminophen',
      c2_id: 500,
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

    await expect(service.getDrug(999)).resolves.toBeNull();

    expect(ndcQuery.getRawMany).not.toHaveBeenCalled();
    expect(relatedQuery.getRawMany).not.toHaveBeenCalled();
  });

  it('looks the drug up by id', async () => {
    await service.getDrug(127);

    expect(drugQuery.select).toHaveBeenCalledWith([
      'rxnconso.id AS id',
      'rxnconso.RXAUI AS RXAUI',
      'rxnconso.RXCUI AS RXCUI',
      'rxnconso.TTY AS TTY',
      'rxnconso.STR AS STR',
    ]);
    expect(drugQuery.where).toHaveBeenCalledWith('rxnconso.id = :id', {
      id: 127,
    });
  });

  it('returns the drug with its NDCs and related drugs', async () => {
    await expect(service.getDrug(127)).resolves.toEqual({
      ...drugRow,
      ATV: '00001, 00002',
      RelatedDrugs: relatedRows,
    });
  });

  it("looks NDCs up by the drug's atom", async () => {
    await service.getDrug(127);

    expect(ndcQuery.select).toHaveBeenCalledWith(['rxnsat.ATV AS ATV']);
    expect(ndcQuery.where).toHaveBeenCalledWith(
      expect.stringContaining('rxnsat.RXAUI = :drugAUI'),
      { drugAUI: '1234567' },
    );
    expect(ndcQuery.where.mock.calls[0][0]).toContain('rxnsat.ATN = "NDC"');
  });

  it('gives an empty NDC list when the drug has none', async () => {
    ndcQuery.getRawMany.mockResolvedValue([]);

    const drug = await service.getDrug(127);

    expect(drug?.ATV).toBe('');
  });

  it('finds relationships on either side of the concept', async () => {
    await service.getDrug(127);

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
    await service.getDrug(127);

    expect(relatedQuery.where).toHaveBeenCalledWith('r.RELA IS NOT NULL');
    const inverse: string = relatedQuery.andWhere.mock.calls[0][0];
    for (const rela of ['inverse_isa', 'ingredient_of', 'tradename_of']) {
      expect(inverse).toContain(`"${rela}"`);
    }
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
    await service.getDrug(127);

    expect(relatedQuery.orderBy).toHaveBeenCalledWith('r.RXCUI1', 'ASC');
    expect(relatedQuery.addOrderBy).toHaveBeenCalledWith('r.RXCUI2', 'ASC');
  });
});
