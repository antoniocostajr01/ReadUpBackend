import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const userRoutes = Router();
const userController = new UserController();

userRoutes.post('/', userController.register);

// Rotas do usuário logado (exigem token)
userRoutes.get('/me', authMiddleware, userController.me);
userRoutes.put('/me', authMiddleware, userController.updateMe);
userRoutes.delete('/me', authMiddleware, userController.deleteMe);
userRoutes.put('/me/genres', authMiddleware, userController.updateGenres);

export { userRoutes };