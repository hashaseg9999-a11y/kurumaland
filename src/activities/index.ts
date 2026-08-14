import type { Activity } from '../core/activity';
import { bigSmallActivity } from './bigSmall';
import { carWashActivity } from './carWash';
import { colorGarageActivity } from './colorGarage';
import { lightsSoundActivity } from './lightsSound';
import { lineUpActivity } from './lineUp';
import { puzzleActivity } from './puzzle';
import { signalActivity } from './signal';
import { traceActivity } from './trace';

export const activities: readonly Activity[] = [
  signalActivity,
  colorGarageActivity,
  bigSmallActivity,
  traceActivity,
  carWashActivity,
  puzzleActivity,
  lightsSoundActivity,
  lineUpActivity,
];
