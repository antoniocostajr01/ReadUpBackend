"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookRoutes = void 0;
const express_1 = require("express");
const book_controller_1 = require("../controllers/book.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const bookRoutes = (0, express_1.Router)();
exports.bookRoutes = bookRoutes;
const bookController = new book_controller_1.BookController();
// Todas as rotas de Book exigem autenticação
bookRoutes.use(auth_middleware_1.authMiddleware);
bookRoutes.post('/', bookController.create);
bookRoutes.get('/', bookController.getAll);
bookRoutes.get('/:id', bookController.getById);
bookRoutes.put('/:id', bookController.update);
bookRoutes.delete('/:id', bookController.delete);
