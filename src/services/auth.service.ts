import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import appleSignin from 'apple-signin-auth';
import { UserRepository } from '../repositories/user.repository';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';
import { EmailService } from './email.service';
import {
    LoginRequestDTO,
    LoginResponseDTO,
    AppleLoginRequestDTO,
    ForgotPasswordRequestDTO,
    ResetPasswordRequestDTO,
    TokenPairDTO,
} from '../dtos/auth.dto';

// O access token continua com 7 dias: a 2.2, que está na loja e não sabe renovar,
// depende disso para não deslogar ainda mais cedo. Quem renova é o refresh.
const ACCESS_TOKEN_TTL = '7d';
// Deslizante: cada renovação emite um refresh novo com mais 90 dias.
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;
// Se o app morre entre o servidor rotacionar e o Keychain gravar o token novo, ele
// volta com o antigo. Dentro desta janela isso não é roubo, é só azar: emite outro par.
const REFRESH_REUSE_GRACE_MS = 60 * 1000;

export class RefreshTokenError extends Error {}

function hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

export class AuthService {
    private userRepository = new UserRepository();
    private refreshTokenRepository = new RefreshTokenRepository();
    private emailService = new EmailService();

    /** Troca um refresh token válido por um par novo (rotação). */
    async refresh(rawRefreshToken: string): Promise<TokenPairDTO> {
        const stored = await this.refreshTokenRepository.findByHash(hashToken(rawRefreshToken));
        const now = new Date();

        if (!stored || stored.expiresAt < now) {
            throw new RefreshTokenError('Invalid or expired refresh token.');
        }

        if (stored.revokedAt) {
            const withinGrace = stored.replacedAt
                && now.getTime() - stored.replacedAt.getTime() < REFRESH_REUSE_GRACE_MS;
            if (!withinGrace) {
                throw new RefreshTokenError('Invalid or expired refresh token.');
            }
            return this.issueTokens(stored.userId);
        }

        await this.refreshTokenRepository.markReplaced(stored.id, now);
        return this.issueTokens(stored.userId);
    }

    /** Para quem veio da 2.2 com um access token válido e nenhum refresh. */
    async issueForUser(userId: string): Promise<TokenPairDTO> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new RefreshTokenError('User not found.');
        }
        return this.issueTokens(userId);
    }

    async logout(rawRefreshToken: string): Promise<void> {
        await this.refreshTokenRepository.revoke(hashToken(rawRefreshToken));
    }

    async login(data: LoginRequestDTO): Promise<LoginResponseDTO> {

        //Busca usuário no banco pelo email
        const user = await this.userRepository.findByEmail(data.email);
        if (!user){
            throw new Error("Incorrect e-mail address or password")
        }

        // Login email/senha: a conta precisa ter senha cadastrada e a senha precisa bater.
        if (!user.passwordHash) {
            throw new Error('Incorrect e-mail address or password');
        }

        // O bcrypt compara a senha pura enviada com o hash salvo no banco
        const isValidPassword = await bcrypt.compare(data.password ?? '', user.passwordHash);
        if (!isValidPassword){
            throw new Error('Incorrect e-mail address or password');
        }

        const { token, refreshToken } = await this.issueTokens(user.id);

        //Devolver usuário com token
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                genres: user.genres
            },
            token,
            refreshToken,
        }
    }

    async loginWithApple(data: AppleLoginRequestDTO): Promise<LoginResponseDTO> {
        const clientId = process.env.APPLE_CLIENT_ID;
        if (!clientId) {
            throw new Error('APPLE_CLIENT_ID is not configured on the server.');
        }

        // Verifica o identityToken (JWT assinado pela Apple) contra as chaves públicas da Apple.
        // Garante que o token é autêntico e foi emitido para o nosso app (audience = bundle id).
        let applePayload;
        try {
            applePayload = await appleSignin.verifyIdToken(data.identityToken, {
                audience: clientId,
                ignoreExpiration: false,
            });
        } catch (error) {
            throw new Error('Invalid Apple identity token.');
        }

        const appleId = applePayload.sub;
        // O email só vem no token no primeiro login; depois usamos o que o app enviar.
        const email = applePayload.email ?? data.email;

        // find-or-create: primeiro por appleId, depois por email, senão cria.
        let user = await this.userRepository.findByAppleId(appleId);

        if (!user && email) {
            const existingByEmail = await this.userRepository.findByEmail(email);
            if (existingByEmail) {
                // Usuário já existe por email (cadastro tradicional) → vincula o appleId.
                user = await this.userRepository.update(existingByEmail.id, { appleId });
            }
        }

        if (!user) {
            if (!email) {
                throw new Error('Apple did not provide an email. Please try again.');
            }
            user = await this.userRepository.create({
                name: data.fullName,
                email,
                password: '', // login Apple não usa senha
                appleId,
            });
        }

        const { token, refreshToken } = await this.issueTokens(user.id);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                genres: user.genres,
            },
            token,
            refreshToken,
        };
    }

    async requestPasswordReset(data: ForgotPasswordRequestDTO): Promise<void> {
        const user = await this.userRepository.findByEmail(data.email);

        // Resposta sempre "ok" para não revelar quais emails existem (evita enumeração).
        if (!user) {
            return;
        }

        // Código de 6 dígitos, salvo como hash + expiração de 15 minutos.
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt.hash(code, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await this.userRepository.update(user.id, {
            resetCodeHash: codeHash,
            resetCodeExpiresAt: expiresAt,
        });

        await this.emailService.sendPasswordResetCode(user.email, code);
    }

    async resetPassword(data: ResetPasswordRequestDTO): Promise<void> {
        const user = await this.userRepository.findByEmail(data.email);

        if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
            throw new Error('Invalid or expired reset code.');
        }

        if (user.resetCodeExpiresAt < new Date()) {
            throw new Error('Invalid or expired reset code.');
        }

        const isValidCode = await bcrypt.compare(data.code, user.resetCodeHash);
        if (!isValidCode) {
            throw new Error('Invalid or expired reset code.');
        }

        const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

        await this.userRepository.update(user.id, {
            passwordHash: newPasswordHash,
            resetCodeHash: null,
            resetCodeExpiresAt: null,
        });
        // Senha nova derruba as sessões abertas em outros aparelhos.
        await this.refreshTokenRepository.revokeAllForUser(user.id);
    }

    private async issueTokens(userId: string): Promise<TokenPairDTO> {
        const refreshToken = randomBytes(32).toString('base64url');
        await this.refreshTokenRepository.create(
            userId,
            hashToken(refreshToken),
            new Date(Date.now() + REFRESH_TOKEN_TTL_MS)
        );
        // Não bloqueia a resposta: é só faxina.
        this.refreshTokenRepository.deleteExpiredForUser(userId).catch(() => {});
        return { token: this.generateToken(userId), refreshToken };
    }

    private generateToken(userId: string): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not configured on the server.');
        }
        return jwt.sign({ userId }, secret, { expiresIn: ACCESS_TOKEN_TTL });
    }
}