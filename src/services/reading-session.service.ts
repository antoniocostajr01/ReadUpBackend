import { ReadingSessionRepository } from '../repositories/reading-session.repository';
import { BookService } from './book.service';
import {
    CreateReadingSessionDTO,
    UpdateReadingSessionDTO,
    ReadingSessionResponseDTO,
} from '../dtos/reading-session.dto';

export class ReadingSessionService {
    private sessionRepository = new ReadingSessionRepository();
    private bookService = new BookService();

    async createSession(data: CreateReadingSessionDTO, userId: string): Promise<ReadingSessionResponseDTO> {
        // Garante que o livro existe e pertence ao usuário (lança 'Book not found'/'Access denied').
        await this.bookService.getBookById(data.bookId, userId);

        const session = await this.sessionRepository.create(data, userId);
        return this.toResponseDTO(session);
    }

    async getUserSessions(userId: string): Promise<ReadingSessionResponseDTO[]> {
        const sessions = await this.sessionRepository.findByUserId(userId);
        return sessions.map(this.toResponseDTO);
    }

    async getBookSessions(bookId: string, userId: string): Promise<ReadingSessionResponseDTO[]> {
        // Garante que o livro pertence ao usuário antes de listar suas sessões.
        await this.bookService.getBookById(bookId, userId);

        const sessions = await this.sessionRepository.findByBookId(bookId, userId);
        return sessions.map(this.toResponseDTO);
    }

    async updateSession(id: string, userId: string, data: UpdateReadingSessionDTO): Promise<ReadingSessionResponseDTO> {
        await this.findAndAuthorize(id, userId);
        const updated = await this.sessionRepository.update(id, data);
        return this.toResponseDTO(updated);
    }

    async deleteSession(id: string, userId: string): Promise<void> {
        await this.findAndAuthorize(id, userId);
        await this.sessionRepository.delete(id);
    }

    // Busca a sessão e verifica se pertence ao usuário
    private async findAndAuthorize(id: string, userId: string) {
        const session = await this.sessionRepository.findById(id);

        if (!session) {
            throw new Error('Session not found');
        }

        if (session.userId !== userId) {
            throw new Error('Access denied');
        }

        return session;
    }

    private toResponseDTO(session: any): ReadingSessionResponseDTO {
        return {
            id: session.id,
            userId: session.userId,
            bookId: session.bookId,
            pagesRead: session.pagesRead,
            thoughts: session.thoughts,
            readingTimeSeconds: session.readingTimeSeconds,
            date: session.date,
        };
    }
}
