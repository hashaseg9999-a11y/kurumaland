import type { GameModule } from '../contracts';
import { SignalGame } from './signalGame';
import { ColorGarageGame } from './colorGarageGame';
import { BigSmallGame } from './bigSmallGame';
import { PoolGame } from './poolGame';
import { LineUpGame } from './lineUpGame';

export const threeGames: readonly GameModule[] = [
  new SignalGame(),
  new ColorGarageGame(),
  new BigSmallGame(),
  new PoolGame(),
  new LineUpGame(),
];
