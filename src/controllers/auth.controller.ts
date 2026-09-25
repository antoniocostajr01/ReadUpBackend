import { Request, Response } from "express";
import { AuthService, RefreshTokenError } from "../services/auth.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class AuthController {
    private authService = new AuthService();

    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const response = await this.authService.login(req.body);

            // Status 200 (OK) porque não está criado nada novo, apenas validando
            res.status(200).json(response)
        } catch (error: any) {
            
            // Status 401 (Unauthorized - Não Autorizado) é o padrão para erro de login
            res.status(401).json({error: error.message});
        }
    }

    apple = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.body?.identityToken) {
                res.status(400).json({ error: 'identityToken is required.' });
                return;
            }
            const response = await this.authService.loginWithApple(req.body);
            res.status(200).json(response);
        } catch (error: any) {
            res.status(401).json({ error: error.message });
        }
    }

    forgotPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            if (!req.body?.email) {
                res.status(400).json({ error: 'email is required.' });
                return;
            }
            await this.authService.requestPasswordReset(req.body);
            // Resposta genérica de propósito (não revela se o email existe).
            res.status(200).json({ message: 'If the email exists, a reset code has been sent.' });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }

    resetPassword = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, code, newPassword } = req.body ?? {};
            if (!email || !code || !newPassword) {
                res.status(400).json({ error: 'email, code and newPassword are required.' });
                return;
            }
            await this.authService.resetPassword(req.body);
            res.status(200).json({ message: 'Password updated successfully.' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    refresh = async (req: Request, res: Response): Promise<void> => {
        const refreshToken = req.body?.refreshToken;
        if (!refreshToken || typeof refreshToken !== 'string') {
            res.status(400).json({ error: 'refreshToken is required.' });
            return;
        }
        try {
            res.status(200).json(await this.authService.refresh(refreshToken));
        } catch (error: any) {
            // Só um refresh inválido é 401: é o único caso em que o app deve deslogar.
            // Falha de banco vira 500 e o app tenta de novo depois.
            const status = error instanceof RefreshTokenError ? 401 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    // Autenticada pelo access token (authMiddleware): quem atualizou da 2.2 ganha
    // um refresh sem precisar logar de novo.
    session = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            res.status(200).json(await this.authService.issueForUser(req.userId!));
        } catch (error: any) {
            const status = error instanceof RefreshTokenError ? 401 : 500;
            res.status(status).json({ error: error.message });
        }
    }

    logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const refreshToken = req.body?.refreshToken;
            if (typeof refreshToken === 'string' && refreshToken) {
                await this.authService.logout(refreshToken);
            }
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}
