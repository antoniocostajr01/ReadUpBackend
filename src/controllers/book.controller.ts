import { Response } from 'express';
import { BookService } from '../services/book.service';
import { BookSearchService } from '../services/search/book-search.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class BookController {
    private bookService = new BookService();
    private bookSearchService = new BookSearchService();

    // Busca de livros: Open Library como índice, Google Books como fallback.
    // `mode=browse` é a vitrine por gênero; qualquer outro valor é busca livre.
    search = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const q = (req.query.q as string | undefined)?.trim() ?? '';
            const lang = req.query.lang as string | undefined;
            const maxResults = req.query.maxResults ? Number(req.query.maxResults) : undefined;

            const results = req.query.mode === 'browse'
                ? await this.bookSearchService.browse({ subject: q, lang, maxResults })
                : await this.bookSearchService.search({
                    query: q,
                    lang,
                    maxResults,
                    startIndex: req.query.startIndex ? Number(req.query.startIndex) : undefined,
                });

            res.status(200).json(results);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

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
            const book = await this.bookService.getBookById(req.params.id as string, req.userId!);
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
            const book = await this.bookService.updateBook(req.params.id as string, req.userId!, req.body);
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
            await this.bookService.deleteBook(req.params.id as string, req.userId!);
            res.status(200).json({ message: 'Book deleted successfully' });
        } catch (error: any) {
            const status = error.message === 'Book not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };
}
