"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    authService = new auth_service_1.AuthService();
    login = async (req, res) => {
        try {
            const response = await this.authService.login(req.body);
            // Status 200 (OK) porque não está criado nada novo, apenas validando
            res.status(200).json(response);
        }
        catch (error) {
            // Status 401 (Unauthorized - Não Autorizado) é o padrão para erro de login
            res.status(401).json({ error: error.message });
        }
    };
    apple = async (req, res) => {
        try {
            if (!req.body?.identityToken) {
                res.status(400).json({ error: 'identityToken is required.' });
                return;
            }
            const response = await this.authService.loginWithApple(req.body);
            res.status(200).json(response);
        }
        catch (error) {
            res.status(401).json({ error: error.message });
        }
    };
    forgotPassword = async (req, res) => {
        try {
            if (!req.body?.email) {
                res.status(400).json({ error: 'email is required.' });
                return;
            }
            await this.authService.requestPasswordReset(req.body);
            // Resposta genérica de propósito (não revela se o email existe).
            res.status(200).json({ message: 'If the email exists, a reset code has been sent.' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    };
    resetPassword = async (req, res) => {
        try {
            const { email, code, newPassword } = req.body ?? {};
            if (!email || !code || !newPassword) {
                res.status(400).json({ error: 'email, code and newPassword are required.' });
                return;
            }
            await this.authService.resetPassword(req.body);
            res.status(200).json({ message: 'Password updated successfully.' });
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
}
exports.AuthController = AuthController;
