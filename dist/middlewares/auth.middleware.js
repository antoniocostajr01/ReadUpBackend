"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authMiddleware = (req, res, next) => {
    //Procura jwt de autorização no cabeçalho da requisição
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'Token not provided. Access denied.' });
        return;
    }
    // O padrão da internet é enviar o token assim: "Bearer eyJhbGciOiJIUzI1..."
    // dividimos a string no espaço e pegamos só a segunda parte (o token limpo)
    const [, token] = authHeader.split(' ');
    try {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT not configured.');
        }
        // 2. O jwt.verify verifica se o token for falso ou expirado, ele dá erro (cai no catch).
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        //Se o token é válido é extraído o ID do usuário e é agrupado com a requisição
        //Dessa maneira a próxima camada (Controller) vai saber exatamente qual usuário está logado
        req.userId = decoded.userId;
        //Libera acesso
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired token. Log in again.' });
        return;
    }
};
exports.authMiddleware = authMiddleware;
