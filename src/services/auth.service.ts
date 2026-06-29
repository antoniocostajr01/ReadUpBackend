import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import appleSignin from 'apple-signin-auth';
import { UserRepository } from '../repositories/user.repository';
import { EmailService } from './email.service';
import {
    LoginRequestDTO,
    LoginResponseDTO,
    AppleLoginRequestDTO,
    ForgotPasswordRequestDTO,
    ResetPasswordRequestDTO,
} from '../dtos/auth.dto';

export class AuthService {
    private userRepository = new UserRepository();
    private emailService = new EmailService();

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

        const token = this.generateToken(user.id);

        //Devolver usuário com token
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                genres: user.genres
            },
            token
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

        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                genres: user.genres,
            },
            token,
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
    }

    private generateToken(userId: string): string {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not configured on the server.');
        }
        return jwt.sign({ userId }, secret, { expiresIn: '7d' });
    }
}