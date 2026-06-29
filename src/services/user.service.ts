import bcrypt from 'bcrypt';
import { UserRepository } from '../repositories/user.repository';
import { CreateUserDTO, UserResponseDTO, MeResponseDTO, UpdateProfileDTO } from '../dtos/user.dto';

// Limite defensivo do tamanho do avatar em base64 (~3MB). O app já comprime antes de enviar.
const MAX_AVATAR_LENGTH = 3_000_000;

export class UserService {
    //Repository é instanciado aqui para poder ser usado
    private userRepository = new UserRepository();

    async registerUser(data: CreateUserDTO): Promise<UserResponseDTO> {
        //1ª regra de negocio: O usuário existe? 

        const userExists = await this.userRepository.findByEmail(data.email);

        if (userExists) {
            throw new Error('E-mail already in use.')
        }

        if (data.appleId) {
            const appleIdExists = await this.userRepository.findByAppleId(data.appleId);
            if (appleIdExists) {
                throw new Error ('Apple ID already linked to another user.');
            }
        }

        //2ª regra de negócio: Criptografar a senha(se ela existir)
        let hashedPassword;
        if (data.password) {
            // O '10' é o "salt rounds", define o quão pesada e segura será a criptografia
            hashedPassword = await bcrypt.hash(data.password, 10);
        }

        //3ª regra: salvar no banco, chamando o repository passando a senha
        const createdUser = await this.userRepository.create(data, hashedPassword);

        //4ª regra: monta o DTO de resposta
        const response: UserResponseDTO = {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            createdAt: createdUser.createdAt
        };

        return response;
    }

    async getMe(userId: string): Promise<MeResponseDTO> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found.');
        }
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            genres: user.genres,
        };
    }

    /**
     * Atualiza nome e/ou foto do usuário (PUT /users/me).
     * `avatar` deve ser uma string base64 (sem o prefixo data:). Enviar null remove a foto.
     */
    async updateProfile(userId: string, data: UpdateProfileDTO): Promise<MeResponseDTO> {
        const update: { name?: string; avatar?: string | null } = {};

        if (data.name !== undefined) {
            const name = String(data.name).trim();
            if (name.length === 0) {
                throw new Error('Name cannot be empty.');
            }
            if (name.length > 60) {
                throw new Error('Name is too long.');
            }
            update.name = name;
        }

        if (data.avatar !== undefined) {
            if (data.avatar === null) {
                update.avatar = null;
            } else {
                const avatar = String(data.avatar);
                if (avatar.length > MAX_AVATAR_LENGTH) {
                    throw new Error('Image is too large.');
                }
                update.avatar = avatar;
            }
        }

        if (Object.keys(update).length === 0) {
            throw new Error('Nothing to update.');
        }

        const user = await this.userRepository.update(userId, update);
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            genres: user.genres,
        };
    }

    async deleteAccount(userId: string): Promise<void> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found.');
        }
        await this.userRepository.delete(userId);
    }

    async updateGenres(userId: string, genres: string[]): Promise<string[]> {
        if (!Array.isArray(genres)) {
            throw new Error('genres must be an array of strings.');
        }
        // Normaliza: remove vazios, duplicados e limita o tamanho.
        const cleaned = Array.from(
            new Set(genres.map(g => String(g).trim()).filter(g => g.length > 0))
        ).slice(0, 30);

        const updated = await this.userRepository.update(userId, { genres: cleaned });
        return updated.genres;
    }
}