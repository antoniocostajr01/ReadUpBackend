import { BookRepository } from '../repositories/book.repository';
import { CreateBookDTO, UpdateBookDTO, BookResponseDTO } from '../dtos/book.dto';

export class BookService {
    private bookRepository = new BookRepository();

    async createBook(data: CreateBookDTO, userId: string): Promise<BookResponseDTO> {
        const book = await this.bookRepository.create(data, userId);
        return this.toResponseDTO(book);
    }

    async getUserBooks(userId: string): Promise<BookResponseDTO[]> {
        const books = await this.bookRepository.findByUserId(userId);
        return books.map(this.toResponseDTO);
    }

    async getBookById(id: string, userId: string): Promise<BookResponseDTO> {
        const book = await this.findAndAuthorize(id, userId);
        return this.toResponseDTO(book);
    }

    async updateBook(id: string, userId: string, data: UpdateBookDTO): Promise<BookResponseDTO> {
        await this.findAndAuthorize(id, userId);
        const updated = await this.bookRepository.update(id, data);
        return this.toResponseDTO(updated);
    }

    async deleteBook(id: string, userId: string): Promise<void> {
        await this.findAndAuthorize(id, userId);
        await this.bookRepository.delete(id);
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

    private toResponseDTO(book: any): BookResponseDTO {
        return {
            id: book.id,
            title: book.title,
            author: book.author,
            totalPages: book.totalPages,
            details: book.details,
            coverUrl: book.coverUrl,
            status: book.status,
            progress: book.progress,
            userId: book.userId,
            createdAt: book.createdAt,
        };
    }
}
