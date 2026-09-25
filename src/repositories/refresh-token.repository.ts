import { prisma } from '../database';

export class RefreshTokenRepository {
    async create(userId: string, tokenHash: string, expiresAt: Date) {
        return await prisma.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
    }

    async findByHash(tokenHash: string) {
        return await prisma.refreshToken.findUnique({
            where: { tokenHash },
        });
    }

    /** Marca como trocado na rotação: revogado, mas ainda dentro da tolerância. */
    async markReplaced(id: string, at: Date) {
        return await prisma.refreshToken.update({
            where: { id },
            data: { revokedAt: at, replacedAt: at },
        });
    }

    async revoke(tokenHash: string) {
        return await prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    async revokeAllForUser(userId: string) {
        return await prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: new Date() },
        });
    }

    /** Limpeza oportunista: tokens vencidos não servem para nada. */
    async deleteExpiredForUser(userId: string) {
        return await prisma.refreshToken.deleteMany({
            where: { userId, expiresAt: { lt: new Date() } },
        });
    }
}
