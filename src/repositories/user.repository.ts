import { Prisma } from '@prisma/client';
import { prisma } from '../database';
import { CreateUserDTO } from '../dtos/user.dto';

export class UserRepository {
    async findByEmail(email: string) {
        return await prisma.user.findUnique({
            where: { email }
        });
    }

    async findByAppleId(appleId: string) {
        return await prisma.user.findUnique({
            where: { appleId }
        });
    }

    async findById(id: string) {
        return await prisma.user.findUnique({
            where: { id }
        });
    }

    async create(data: CreateUserDTO, passwordHash?: string) {
        return await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                appleId: data.appleId,
                passwordHash: passwordHash
            },
        });
    }

    async update(id: string, data: Prisma.UserUpdateInput) {
        return await prisma.user.update({
            where: { id },
            data,
        });
    }
}
