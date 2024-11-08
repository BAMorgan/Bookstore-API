import express, { Router } from 'express';

import { libraryRouter } from './library';

const openRoutes: Router = express.Router();

openRoutes.use('/library', libraryRouter);


export { openRoutes };
