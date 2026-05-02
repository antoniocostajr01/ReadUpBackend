import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { error } from "node:console";

// Como o Express não sabe nativamente que o nosso Request vai ter um 'userId',
// por isso é criada uma interface estendida para avisar o TypeScript que essa variável existe.
export interface AuthRequest extends Request {
    userId?: string;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction): void => {
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
        const decoded = jwt.verify(token, secret) as { userId: string };

        //Se o token é válido é extraído o ID do usuário e é agrupado com a requisição
        //Dessa maneira a próxima camada (Controller) vai saber exatamente qual usuário está logado
        req.userId = decoded.userId;

        //Libera acesso
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token. Log in again.' });
        return;
    }


}