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
    genres: string[];
}

export interface UpdateGenresDTO {
    genres: string[];
}