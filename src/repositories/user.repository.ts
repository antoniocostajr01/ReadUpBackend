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
}
