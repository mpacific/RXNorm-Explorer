import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchModule } from './search/search.module';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { DrugModule } from './drug/drug.module';
import { DrugController } from './drug/drug.controller';
import { DrugService } from './drug/drug.service';
import { RXNCONSO } from './db/entities/RXNCONSO.entity';
import { RXNREL } from './db/entities/RXNREL.entity';
import { RXNSAT } from './db/entities/RXNSAT.entity';

// Builds each feature module the way the app does, with stand-in repositories
// in place of the database, to check its controller and service resolve.
describe.each([
  ['SearchModule', SearchModule, SearchController, SearchService],
  ['DrugModule', DrugModule, DrugController, DrugService],
])('%s', (_, featureModule, controller, service) => {
  it('provides its controller and service', async () => {
    const module = await Test.createTestingModule({
      imports: [featureModule],
    })
      .overrideProvider(getRepositoryToken(RXNCONSO))
      .useValue({})
      .overrideProvider(getRepositoryToken(RXNREL))
      .useValue({})
      .overrideProvider(getRepositoryToken(RXNSAT))
      .useValue({})
      .compile();

    expect(module.get(controller)).toBeInstanceOf(controller);
    expect(module.get(service)).toBeInstanceOf(service);
  });
});
