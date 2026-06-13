"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRoutes = void 0;
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
// import { authMiddleware } from '../middlewares/auth.middleware';
const aiRoutes = (0, express_1.Router)();
exports.aiRoutes = aiRoutes;
const aiController = new ai_controller_1.AiController();
// TODO: Reativar authMiddleware quando o app iOS tiver login pro backend
// aiRoutes.post('/chat', authMiddleware, aiController.chat);
aiRoutes.post('/chat', aiController.chat);
