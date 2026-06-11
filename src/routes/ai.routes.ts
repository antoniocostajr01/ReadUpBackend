import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
// import { authMiddleware } from '../middlewares/auth.middleware';

const aiRoutes = Router();
const aiController = new AiController();

// TODO: Reativar authMiddleware quando o app iOS tiver login pro backend
// aiRoutes.post('/chat', authMiddleware, aiController.chat);
aiRoutes.post('/chat', aiController.chat);

export { aiRoutes };
