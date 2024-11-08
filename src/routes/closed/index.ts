import express, { Router } from 'express';

import { checkToken } from '../../core/middleware';
import { tokenTestRouter } from './tokenTest';
import { libraryRouter } from './closed_message';

const closedRoutes: Router = express.Router();

closedRoutes.use('/jwt_test', checkToken, tokenTestRouter);

closedRoutes.use('/c/library', checkToken, libraryRouter);

export { closedRoutes };
