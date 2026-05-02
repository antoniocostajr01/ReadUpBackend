import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { LoginRequestDTO, LoginResponseDTO } from '../dtos/auth.dto';

export class AuthService {
    private userRepository = new UserRepository();

    async login(data: LoginRequestDTO): Promise<LoginResponseDTO> {


        //Busca usuário no banco pelo email
        const user = await this.userRepository.findByEmail(data.email);
        if (!user){
            throw new Error("Incorrect e-mail address or password")
        }

        //Verifica a senha caso não seja login Apple
        if (data.password && user.passwordHash) {

            // O bcrypt compara a senha pura enviada com o hash salvo no banco
            const isValidPassword = await bcrypt.compare(data.password, user.passwordHash);
            if (!isValidPassword){
                throw new Error('Invalid credentials');
            }
        }

        //Gera JWT
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            throw new Error('JWT_SECRET is not configured on the server.')
        }


        const token = jwt.sign({userId: user.id}, secret, { expiresIn: '7d' });

        //Devolver usuário com tolkien
        return {
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            },
            token
        }
    }
}