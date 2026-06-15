import { Response } from 'express';
import { ReadingSessionService } from '../services/reading-session.service';
import { AuthRequest } from '../middlewares/auth.middleware';

export class ReadingSessionController {
    private sessionService = new ReadingSessionService();

    create = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const session = await this.sessionService.createSession(req.body, req.userId!);
            res.status(201).json(session);
        } catch (error: any) {
            const status = error.message === 'Book not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };

    getAll = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const sessions = await this.sessionService.getUserSessions(req.userId!);
            res.status(200).json(sessions);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    getByBook = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const sessions = await this.sessionService.getBookSessions(req.params.bookId as string, req.userId!);
            res.status(200).json(sessions);
        } catch (error: any) {
            const status = error.message === 'Book not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };

    update = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const session = await this.sessionService.updateSession(req.params.id as string, req.userId!, req.body);
            res.status(200).json(session);
        } catch (error: any) {
            const status = error.message === 'Session not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };

    delete = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            await this.sessionService.deleteSession(req.params.id as string, req.userId!);
            res.status(200).json({ message: 'Session deleted successfully' });
        } catch (error: any) {
            const status = error.message === 'Session not found' ? 404
                         : error.message === 'Access denied' ? 403
                         : 400;
            res.status(status).json({ error: error.message });
        }
    };
}
