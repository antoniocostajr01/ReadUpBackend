import { BookRepository } from '../repositories/book.repository';
import { BookStatus } from '@prisma/client';
import { CreateBookDTO, UpdateBookDTO, BookResponseDTO, BookPageDTO, BookCountsDTO } from '../dtos/book.dto';

// Limite defensivo do tamanho da capa em base64 (~2MB). O app já comprime antes de enviar.
const MAX_COVER_IMAGE_LENGTH = 2_000_000;
const MAX_PAGE_SIZE = 50;

/**
 * Versão da capa: segundos desde a epoch (cabe num Int do Postgres até 2038), mas
 * sempre maior que a anterior — duas trocas no mesmo segundo teriam o mesmo `?v=` e
 * o app continuaria com a capa velha em cache.
 */
function newCoverVersion(previous?: number | null): number {
    return Math.max(Math.floor(Date.now() / 1000), (previous ?? 0) + 1);
}

export class BookService {
    private bookRepository = new BookRepository();

    async createBook(data: CreateBookDTO, userId: string, baseUrl: string): Promise<BookResponseDTO> {
        this.validateCoverImage(data.coverImage);
        this.validateStatus(data.status);
        const book = await this.bookRepository.create(
            { ...data, coverVersion: data.coverImage ? newCoverVersion() : undefined },
            userId
        );
        return this.toResponseDTO(book, baseUrl);
    }

    async getUserBooks(userId: string, baseUrl: string): Promise<BookResponseDTO[]> {
        const books = await this.bookRepository.findByUserId(userId);
        return books.map(book => this.toResponseDTO(book, baseUrl));
    }

    async getUserBooksPage(
        userId: string,
        params: { limit?: number; offset?: number; status?: string; q?: string },
        baseUrl: string
    ): Promise<BookPageDTO> {
        const limit = Math.min(Math.max(Math.trunc(params.limit ?? 10) || 10, 1), MAX_PAGE_SIZE);
        const offset = Math.max(Math.trunc(params.offset ?? 0) || 0, 0);
        const status = params.status ? (params.status as BookStatus) : undefined;
        this.validateStatus(status);
        const q = params.q?.trim() || undefined;

        const { items, total } = await this.bookRepository.findPageByUserId(userId, { limit, offset, status, q });
        return {
            items: items.map(book => this.toResponseDTO(book, baseUrl)),
            total,
            hasMore: offset + items.length < total,
        };
    }

    async getStatusCounts(userId: string, q?: string): Promise<BookCountsDTO> {
        const groups = await this.bookRepository.countByStatus(userId, q?.trim() || undefined);
        const counts: BookCountsDTO = {
            all: 0, read: 0, reading: 0, i_want_to_read: 0, abandoned: 0, rereading: 0,
        };
        for (const group of groups) {
            counts[group.status] = group._count._all;
            counts.all += group._count._all;
        }
        return counts;
    }

    // baseUrl tem default vazio porque reading-session.service.ts chama este método
    // apenas para validar posse do livro, descartando o coverUrl do retorno.
    async getBookById(id: string, userId: string, baseUrl: string = ''): Promise<BookResponseDTO> {
        const book = await this.findAndAuthorize(id, userId);
        return this.toResponseDTO(book, baseUrl);
    }

    async updateBook(id: string, userId: string, data: UpdateBookDTO, baseUrl: string): Promise<BookResponseDTO> {
        this.validateCoverImage(data.coverImage);
        this.validateStatus(data.status);
        const current = await this.findAndAuthorize(id, userId);
        const coverVersion = data.coverImage === undefined ? undefined
                           : data.coverImage ? newCoverVersion(current.coverVersion)
                           : null;
        const updated = await this.bookRepository.update(id, { ...data, coverVersion });
        return this.toResponseDTO(updated, baseUrl);
    }

    /** Usado pela criação de sessão, que já checou a posse do livro. */
    async markAsReading(id: string): Promise<void> {
        await this.bookRepository.update(id, { status: BookStatus.reading });
    }

    async deleteBook(id: string, userId: string): Promise<void> {
        await this.findAndAuthorize(id, userId);
        await this.bookRepository.delete(id);
    }

    /** Devolve os bytes da capa enviada pelo usuário, ou null se o livro não tem uma. */
    async getCoverImage(id: string): Promise<Buffer | null> {
        const coverImage = await this.bookRepository.findCoverImage(id);
        if (!coverImage) return null;
        return Buffer.from(coverImage, 'base64');
    }

    // Busca o livro e verifica se pertence ao usuário
    private async findAndAuthorize(id: string, userId: string) {
        const book = await this.bookRepository.findById(id);

        if (!book) {
            throw new Error('Book not found');
        }

        if (book.userId !== userId) {
            throw new Error('Access denied');
        }

        return book;
    }

    /** `status` vem do corpo da requisição; sem checar, o Prisma estoura com um erro cru. */
    private validateStatus(status?: BookStatus): void {
        if (status && !Object.values(BookStatus).includes(status)) {
            throw new Error('Invalid book status');
        }
    }

    private validateCoverImage(coverImage?: string): void {
        if (coverImage !== undefined && coverImage.length > MAX_COVER_IMAGE_LENGTH) {
            throw new Error('Cover image is too large.');
        }
    }

    private toResponseDTO(book: any, baseUrl: string): BookResponseDTO {
        return {
            id: book.id,
            title: book.title,
            author: book.author,
            totalPages: book.totalPages,
            details: book.details,
            // `?v=` muda quando a imagem muda: a rota da capa é sempre a mesma, então
            // sem isso o app (URLCache e cache em memória) continuava mostrando a capa
            // antiga depois de o usuário trocar a foto.
            coverUrl: book.coverVersion
                ? `${baseUrl}/books/${book.id}/cover?v=${book.coverVersion}`
                : book.coverUrl,
            isbn: book.isbn,
            status: book.status,
            progress: book.progress,
            userId: book.userId,
            createdAt: book.createdAt,
        };
    }
}
