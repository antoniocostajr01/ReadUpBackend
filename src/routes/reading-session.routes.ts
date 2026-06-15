import { Router } from 'express';
import { ReadingSessionController } from '../controllers/reading-session.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const sessionRoutes = Router();
const sessionController = new ReadingSessionController();

// Todas as rotas de ReadingSession exigem autenticação
sessionRoutes.use(authMiddleware);

sessionRoutes.post('/', sessionController.create);
sessionRoutes.get('/', sessionController.getAll);
sessionRoutes.get('/book/:bookId', sessionController.getByBook);
sessionRoutes.put('/:id', sessionController.update);
sessionRoutes.delete('/:id', sessionController.delete);

export { sessionRoutes };
