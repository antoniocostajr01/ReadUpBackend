import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

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
}