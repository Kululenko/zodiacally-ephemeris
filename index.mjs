// ES module entry point: the same engine instance as the CommonJS entry (index.js), with named exports.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const eph = require('./index.js');

export const { BODIES, utcToJd, jdUT1ToUtc, deltaTSeconds, position, positionTT, houses, info } = eph;
export default eph;
