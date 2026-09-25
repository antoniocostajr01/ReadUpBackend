import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const authRoutes = Router();
const authController = new AuthController();

authRoutes.post('/login', authController.login);
authRoutes.post('/apple', authController.apple);
authRoutes.post('/forgot-password', authController.forgotPassword);
authRoutes.post('/reset-password', authController.resetPassword);
authRoutes.post('/refresh', authController.refresh);
authRoutes.post('/session', authMiddleware, authController.session);
authRoutes.post('/logout', authController.logout);

export { authRoutes };