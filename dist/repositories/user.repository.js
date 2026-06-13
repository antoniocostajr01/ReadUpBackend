"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const database_1 = require("../database");
class UserRepository {
    async findByEmail(email) {
        return await database_1.prisma.user.findUnique({
            where: { email }
        });
    }
    async findByAppleId(appleId) {
        return await database_1.prisma.user.findUnique({
            where: { appleId }
        });
    }
    async findById(id) {
        return await database_1.prisma.user.findUnique({
            where: { id }
        });
    }
    async create(data, passwordHash) {
        return await database_1.prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                appleId: data.appleId,
                passwordHash: passwordHash
            },
        });
    }
    async update(id, data) {
        return await database_1.prisma.user.update({
            where: { id },
            data,
        });
    }
}
exports.UserRepository = UserRepository;
