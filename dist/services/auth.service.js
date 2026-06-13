"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const apple_signin_auth_1 = __importDefault(require("apple-signin-auth"));
const user_repository_1 = require("../repositories/user.repository");
const email_service_1 = require("./email.service");
class AuthService {
    userRepository = new user_repository_1.UserRepository();
    emailService = new email_service_1.EmailService();
    async login(data) {
        //Busca usuário no banco pelo email
        const user = await this.userRepository.findByEmail(data.email);
        if (!user) {
            throw new Error("Incorrect e-mail address or password");
        }
        // Login email/senha: a conta precisa ter senha cadastrada e a senha precisa bater.
        if (!user.passwordHash) {
            throw new Error('Incorrect e-mail address or password');
        }
        // O bcrypt compara a senha pura enviada com o hash salvo no banco
        const isValidPassword = await bcrypt_1.default.compare(data.password ?? '', user.passwordHash);
        if (!isValidPassword) {
            throw new Error('Incorrect e-mail address or password');
        }
        const token = this.generateToken(user.id);
        //Devolver usuário com token
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token
        };
    }
    async loginWithApple(data) {
        const clientId = process.env.APPLE_CLIENT_ID;
        if (!clientId) {
            throw new Error('APPLE_CLIENT_ID is not configured on the server.');
        }
        // Verifica o identityToken (JWT assinado pela Apple) contra as chaves públicas da Apple.
        // Garante que o token é autêntico e foi emitido para o nosso app (audience = bundle id).
        let applePayload;
        try {
            applePayload = await apple_signin_auth_1.default.verifyIdToken(data.identityToken, {
                audience: clientId,
                ignoreExpiration: false,
            });
        }
        catch (error) {
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
            },
            token,
        };
    }
    async requestPasswordReset(data) {
        const user = await this.userRepository.findByEmail(data.email);
        // Resposta sempre "ok" para não revelar quais emails existem (evita enumeração).
        if (!user) {
            return;
        }
        // Código de 6 dígitos, salvo como hash + expiração de 15 minutos.
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const codeHash = await bcrypt_1.default.hash(code, 10);
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        await this.userRepository.update(user.id, {
            resetCodeHash: codeHash,
            resetCodeExpiresAt: expiresAt,
        });
        await this.emailService.sendPasswordResetCode(user.email, code);
    }
    async resetPassword(data) {
        const user = await this.userRepository.findByEmail(data.email);
        if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt) {
            throw new Error('Invalid or expired reset code.');
        }
        if (user.resetCodeExpiresAt < new Date()) {
            throw new Error('Invalid or expired reset code.');
        }
        const isValidCode = await bcrypt_1.default.compare(data.code, user.resetCodeHash);
        if (!isValidCode) {
            throw new Error('Invalid or expired reset code.');
        }
        const newPasswordHash = await bcrypt_1.default.hash(data.newPassword, 10);
        await this.userRepository.update(user.id, {
            passwordHash: newPasswordHash,
            resetCodeHash: null,
            resetCodeExpiresAt: null,
        });
    }
    generateToken(userId) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT_SECRET is not configured on the server.');
        }
        return jsonwebtoken_1.default.sign({ userId }, secret, { expiresIn: '7d' });
    }
}
exports.AuthService = AuthService;
