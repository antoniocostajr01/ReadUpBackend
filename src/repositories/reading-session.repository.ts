import { prisma } from '../database';
import { CreateReadingSessionDTO, UpdateReadingSessionDTO } from '../dtos/reading-session.dto';

export class ReadingSessionRepository {
    async create(data: CreateReadingSessionDTO, userId: string) {
        return await prisma.readingSession.create({
            data: {
                bookId: data.bookId,
                pagesRead: data.pagesRead,
                thoughts: data.thoughts,
                readingTimeSeconds: data.readingTimeSeconds,
                userId: userId,
            },
        });
    }

    async findByUserId(userId: string) {
        return await prisma.readingSession.findMany({
            where: { userId },
            orderBy: { date: 'desc' },
        });
    }

    async findByBookId(bookId: string, userId: string) {
        return await prisma.readingSession.findMany({
            where: { bookId, userId },
            orderBy: { date: 'desc' },
        });
    }

    async findById(id: string) {
        return await prisma.readingSession.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: UpdateReadingSessionDTO) {
        return await prisma.readingSession.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return await prisma.readingSession.delete({
            where: { id },
        });
    }
}
