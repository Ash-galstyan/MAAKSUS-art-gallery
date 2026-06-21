// backend/src/modules/payments/payments.routes.ts
import { Router } from 'express';
import { asyncH } from '../../lib/async-handler';
import * as ctrl from './payments.controller';

const router = Router();

// Customer's browser arrives here from the bank — no auth, but bound to the
// order via the orderID query param which is unguessable enough for our flow.
// (For higher security, sign the orderID with HMAC at checkout time and verify
// it here. Out of scope for v1.)
router.get('/ameriabank/return', asyncH(ctrl.ameriabankReturn));

export default router;
