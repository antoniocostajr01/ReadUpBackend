import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const aiRoutes = Router();
const aiController = new AiController();

// Rota protegida — usuário precisa estar autenticado
aiRoutes.post('/chat', authMiddleware, aiController.chat);

export { aiRoutes };
