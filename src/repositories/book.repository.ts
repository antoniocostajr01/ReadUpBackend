import { Prisma } from "@prisma/client";
import { CrateBookDTO } from "../dtos/book.dto";
import { prisma } from "../database";

export class BookRepository {
    async create(data: CrateBookDTO, userId: string) {
        return await prisma.book.create({
            data: {
                title: data.title,
                author: data.author,
                totalPages: data.totalPages,
                userId: userId, // A mágica do relacionamento acontece aqui!
            },
        });
    }

    // Busca todos os livros de um usuário específico
    async findByUserId(userId: string) {
        return await prisma.book.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        })
    }
}