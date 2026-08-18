import { BookRepository } from '../repositories/book.repository';
import { BookStatus } from '@prisma/client';
import { CreateBookDTO, UpdateBookDTO, BookResponseDTO } from '../dtos/book.dto';

// Limite defensivo do tamanho da capa em base64 (~2MB). O app já comprime antes de enviar.
const MAX_COVER_IMAGE_LENGTH = 2_000_000;

export class BookService {
    private bookRepository = new BookRepository();

    async createBook(data: CreateBookDTO, userId: string, baseUrl: string): Promise<BookResponseDTO> {
        this.validateCoverImage(data.coverImage);
        this.validateStatus(data.status);
        const book = await this.bookRepository.create(data, userId);
        return this.toResponseDTO(book, baseUrl);
    }

    async getUserBooks(userId: string, baseUrl: string): Promise<BookResponseDTO[]> {
        const books = await this.bookRepository.findByUserId(userId);
        return books.map(book => this.toResponseDTO(book, baseUrl));
    }

    // baseUrl tem default vazio porque reading-session.service.ts chama este método
    // apenas para validar posse do livro, descartando o coverUrl do retorno.
    async getBookById(id: string, userId: string, baseUrl: string = ''): Promise<BookResponseDTO> {
        const book = await this.findAndAuthorize(id, userId);
        return this.toResponseDTO(book, baseUrl);
    }

    async updateBook(id: string, userId: string, data: UpdateBookDTO, baseUrl: string): Promise<BookResponseDTO> {
        this.validateCoverImage(data.coverImage);
        await this.findAndAuthorize(id, userId);
        const updated = await this.bookRepository.update(id, data);
        return this.toResponseDTO(updated, baseUrl);
    }

    async deleteBook(id: string, userId: string): Promise<void> {
        await this.findAndAuthorize(id, userId);
        await this.bookRepository.delete(id);
    }

    /** Devolve os bytes da capa enviada pelo usuário, ou null se o livro não tem uma. */
    async getCoverImage(id: string): Promise<Buffer | null> {
        const book = await this.bookRepository.findById(id);
        if (!book?.coverImage) return null;
        return Buffer.from(book.coverImage, 'base64');
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
            coverUrl: book.coverImage ? `${baseUrl}/books/${book.id}/cover` : book.coverUrl,
            isbn: book.isbn,
            status: book.status,
            progress: book.progress,
            userId: book.userId,
            createdAt: book.createdAt,
        };
    }
}
