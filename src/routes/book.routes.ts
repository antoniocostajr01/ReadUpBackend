import { Router } from 'express';
import { BookController } from '../controllers/book.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const bookRoutes = Router();
const bookController = new BookController();

// Busca no Google Books é pública (convidados usam a aba de busca, sem conta).
// Precisa vir ANTES do authMiddleware e antes de /:id.
bookRoutes.get('/search', bookController.search);
bookRoutes.get('/:id/cover', bookController.getCover);

// As demais rotas de Book (biblioteca do usuário) exigem autenticação.
bookRoutes.use(authMiddleware);

bookRoutes.post('/', bookController.create);
bookRoutes.get('/', bookController.getAll);
bookRoutes.get('/:id', bookController.getById);
bookRoutes.put('/:id', bookController.update);
bookRoutes.delete('/:id', bookController.delete);

export { bookRoutes };
