import { prisma } from '../database';
import { CreateBookDTO, UpdateBookDTO } from '../dtos/book.dto';

export class BookRepository {
    async create(data: CreateBookDTO, userId: string) {
        return await prisma.book.create({
            data: {
                title: data.title,
                author: data.author,
                totalPages: data.totalPages,
                details: data.details,
                coverUrl: data.coverUrl,
                userId: userId,
            },
        });
    }

    async findByUserId(userId: string) {
        return await prisma.book.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findById(id: string) {
        return await prisma.book.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: UpdateBookDTO) {
        return await prisma.book.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return await prisma.book.delete({
            where: { id },
        });
    }
}
