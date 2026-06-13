"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const user_repository_1 = require("../repositories/user.repository");
class UserService {
    //Repository é instanciado aqui para poder ser usado
    userRepository = new user_repository_1.UserRepository();
    async registerUser(data) {
        //1ª regra de negocio: O usuário existe? 
        const userExists = await this.userRepository.findByEmail(data.email);
        if (userExists) {
            throw new Error('E-mail already in use.');
        }
        if (data.appleId) {
            const appleIdExists = await this.userRepository.findByAppleId(data.appleId);
            if (appleIdExists) {
                throw new Error('Apple ID already linked to another user.');
            }
        }
        //2ª regra de negócio: Criptografar a senha(se ela existir)
        let hashedPassword;
        if (data.password) {
            // O '10' é o "salt rounds", define o quão pesada e segura será a criptografia
            hashedPassword = await bcrypt_1.default.hash(data.password, 10);
        }
        //3ª regra: salvar no banco, chamando o repository passando a senha
        const createdUser = await this.userRepository.create(data, hashedPassword);
        //4ª regra: monta o DTO de resposta
        const response = {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            createdAt: createdUser.createdAt
        };
        return response;
    }
}
exports.UserService = UserService;
