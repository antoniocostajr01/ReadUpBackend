"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
class UserController {
    userService = new user_service_1.UserService();
    register = async (req, res) => {
        try {
            // Pega os dados que vieram no corpo (body) da requisição
            const data = req.body;
            // Passa para o service
            const userResponse = await this.userService.registerUser(data);
            res.status(201).json(userResponse);
        }
        catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
}
exports.UserController = UserController;
