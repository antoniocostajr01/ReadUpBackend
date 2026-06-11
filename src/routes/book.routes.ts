import { Router } from 'express';
import { BookController } from '../controllers/book.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const bookRoutes = Router();
const bookController = new BookController();

// Todas as rotas de Book exigem autenticação
bookRoutes.use(authMiddleware);

bookRoutes.post('/', bookController.create);
bookRoutes.get('/', bookController.getAll);
bookRoutes.get('/:id', bookController.getById);
bookRoutes.put('/:id', bookController.update);
bookRoutes.delete('/:id', bookController.delete);

export { bookRoutes };
