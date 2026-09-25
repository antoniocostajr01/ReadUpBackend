import { BookStatus, Prisma } from '@prisma/client';
import { prisma } from '../database';
import { CreateBookDTO, UpdateBookDTO } from '../dtos/book.dto';

// A capa em base64 pode ter ~2MB por livro. Nenhuma listagem precisa dela — só a
// rota da capa — então fica de fora de tudo o que devolve livros para o app.
const withoutCover = { coverImage: true } as const;

export interface BookPageQuery {
    limit: number;
    offset: number;
    status?: BookStatus;
    q?: string;
}

export class BookRepository {
    async create(data: CreateBookDTO & { coverVersion?: number }, userId: string) {
        return await prisma.book.create({
            omit: withoutCover,
            data: {
                title: data.title,
                author: data.author,
                totalPages: data.totalPages,
                details: data.details,
                coverUrl: data.coverUrl,
                isbn: data.isbn,
                coverImage: data.coverImage,
                coverVersion: data.coverVersion,
                // Sem isto o Prisma aplica o default `reading` e o status escolhido pelo
                // usuário (no scanner e na busca) era descartado em silêncio.
                status: data.status,
                userId: userId,
            },
        });
    }

    async findByUserId(userId: string) {
        return await prisma.book.findMany({
            omit: withoutCover,
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /** Uma página da estante, na mesma ordem da grade do app (título, depois id). */
    async findPageByUserId(userId: string, query: BookPageQuery) {
        const where = this.pageWhere(userId, query.q, query.status);
        const [items, total] = await prisma.$transaction([
            prisma.book.findMany({
                omit: withoutCover,
                where,
                orderBy: [{ title: 'asc' }, { id: 'asc' }],
                take: query.limit,
                skip: query.offset,
            }),
            prisma.book.count({ where }),
        ]);
        return { items, total };
    }

    /** Quantos livros há em cada status, respeitando a busca por título/autor. */
    async countByStatus(userId: string, q?: string) {
        return await prisma.book.groupBy({
            by: ['status'],
            where: this.pageWhere(userId, q),
            _count: { _all: true },
        });
    }

    async findById(id: string) {
        return await prisma.book.findUnique({
            omit: withoutCover,
            where: { id },
        });
    }

    /** Só a rota da capa lê o base64. */
    async findCoverImage(id: string) {
        const book = await prisma.book.findUnique({
            where: { id },
            select: { coverImage: true },
        });
        return book?.coverImage ?? null;
    }

    async update(id: string, data: UpdateBookDTO & { coverVersion?: number | null }) {
        return await prisma.book.update({
            omit: withoutCover,
            where: { id },
            data,
        });
    }

    private pageWhere(userId: string, q?: string, status?: BookStatus): Prisma.BookWhereInput {
        const where: Prisma.BookWhereInput = { userId };
        if (status) where.status = status;
        if (q) {
            where.OR = [
                { title: { contains: q, mode: 'insensitive' } },
                { author: { contains: q, mode: 'insensitive' } },
            ];
        }
        return where;
    }

    async delete(id: string) {
        return await prisma.book.delete({
            omit: withoutCover,
            where: { id },
        });
    }
}
