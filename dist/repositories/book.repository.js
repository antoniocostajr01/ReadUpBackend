"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookRepository = void 0;
const database_1 = require("../database");
class BookRepository {
    async create(data, userId) {
        return await database_1.prisma.book.create({
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
    async findByUserId(userId) {
        return await database_1.prisma.book.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id) {
        return await database_1.prisma.book.findUnique({
            where: { id },
        });
    }
    async update(id, data) {
        return await database_1.prisma.book.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return await database_1.prisma.book.delete({
            where: { id },
        });
    }
}
exports.BookRepository = BookRepository;
