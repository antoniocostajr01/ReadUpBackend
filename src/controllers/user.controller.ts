import { Request, Response } from "express";
import { UserService } from "../services/user.service";

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
}