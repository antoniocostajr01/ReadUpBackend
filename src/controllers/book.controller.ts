import { Response } from 'express';
import { BookService } from '../services/book.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class BookController {
    private bookService = new BookService();

    create = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const book = await this.bookService.createBook(req.body, req.userId!);
            res.status(201).json(book);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    getAll = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const books = await this.bookService.getUserBooks(req.userId!);
            res.status(200).json(books);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    getById = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const book = await this.bookService.getBookById(req.params.id, req.userId!);
            res.status(200).json(book);
        } catch (error: any) {
            const status = error.message === 'Book not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };

    update = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const book = await this.bookService.updateBook(req.params.id, req.userId!, req.body);
            res.status(200).json(book);
        } catch (error: any) {
            const status = error.message === 'Book not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };

    delete = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            await this.bookService.deleteBook(req.params.id, req.userId!);
            res.status(200).json({ message: 'Book deleted successfully' });
        } catch (error: any) {
            const status = error.message === 'Book not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };
}
