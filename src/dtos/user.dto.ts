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