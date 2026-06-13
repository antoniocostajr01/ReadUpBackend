"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookController = void 0;
const book_service_1 = require("../services/book.service");
class BookController {
    bookService = new book_service_1.BookService();
    create = async (req, res) => {
        try {
            const book = await this.bookService.createBook(req.body, req.userId);
            res.status(201).json(book);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
    getAll = async (req, res) => {
        try {
            const books = await this.bookService.getUserBooks(req.userId);
            res.status(200).json(books);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
    getById = async (req, res) => {
        try {
            const book = await this.bookService.getBookById(req.params.id, req.userId);
            res.status(200).json(book);
        }
        catch (error) {
            const status = error.message === 'Book not found' ? 404
                : error.message === 'Access denied' ? 403
                    : 400;
            res.status(status).json({ error: error.message });
        }
    };
    update = async (req, res) => {
        try {
            const book = await this.bookService.updateBook(req.params.id, req.userId, req.body);
            res.status(200).json(book);
        }
        catch (error) {
            const status = error.message === 'Book not found' ? 404
                : error.message === 'Access denied' ? 403
                    : 400;
            res.status(status).json({ error: error.message });
        }
    };
    delete = async (req, res) => {
        try {
            await this.bookService.deleteBook(req.params.id, req.userId);
            res.status(200).json({ message: 'Book deleted successfully' });
        }
        catch (error) {
            const status = error.message === 'Book not found' ? 404
                : error.message === 'Access denied' ? 403
                    : 400;
            res.status(status).json({ error: error.message });
        }
    };
}
exports.BookController = BookController;
