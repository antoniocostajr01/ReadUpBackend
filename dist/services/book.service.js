"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookService = void 0;
const book_repository_1 = require("../repositories/book.repository");
class BookService {
    bookRepository = new book_repository_1.BookRepository();
    async createBook(data, userId) {
        const book = await this.bookRepository.create(data, userId);
        return this.toResponseDTO(book);
    }
    async getUserBooks(userId) {
        const books = await this.bookRepository.findByUserId(userId);
        return books.map(this.toResponseDTO);
    }
    async getBookById(id, userId) {
        const book = await this.findAndAuthorize(id, userId);
        return this.toResponseDTO(book);
    }
    async updateBook(id, userId, data) {
        await this.findAndAuthorize(id, userId);
        const updated = await this.bookRepository.update(id, data);
        return this.toResponseDTO(updated);
    }
    async deleteBook(id, userId) {
        await this.findAndAuthorize(id, userId);
        await this.bookRepository.delete(id);
    }
    // Busca o livro e verifica se pertence ao usuário
    async findAndAuthorize(id, userId) {
        const book = await this.bookRepository.findById(id);
        if (!book) {
            throw new Error('Book not found');
        }
        if (book.userId !== userId) {
            throw new Error('Access denied');
        }
        return book;
    }
    toResponseDTO(book) {
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
exports.BookService = BookService;
