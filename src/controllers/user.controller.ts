import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { AuthRequest } from "../middlewares/auth.middleware";

export class UserController {
    private userService = new UserService();

    register = async (req: Request, res: Response): Promise<void> => {
        try {
            // Pega os dados que vieram no corpo (body) da requisição
            const data = req.body;

             // Passa para o service
             const userResponse = await this.userService.registerUser(data);

             res.status(201).json(userResponse);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };

    me = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const user = await this.userService.getMe(req.userId!);
            res.status(200).json(user);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    };

    updateGenres = async (req: AuthRequest, res: Response): Promise<void> => {
        try {
            const genres = await this.userService.updateGenres(req.userId!, req.body?.genres);
            res.status(200).json({ genres });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    };
}