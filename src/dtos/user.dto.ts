export interface CreateUserDTO {
    name?: string;
    email: string;
    password: string;
    appleId?: string;
}

export interface UserResponseDTO {
    id: string;
    name: string | null;
    email: string;
    createdAt: Date;
}

export interface MeResponseDTO {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    genres: string[];
}

export interface UpdateGenresDTO {
    genres: string[];
}

/** Atualização parcial do perfil (PUT /users/me): nome e/ou foto (base64). */
export interface UpdateProfileDTO {
    name?: string;
    avatar?: string | null;
}