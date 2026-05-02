export interface LoginRequestDTO {
    email: string,
    password?: string;
    appleId?: string;
}

export interface LoginResponseDTO {
    user: {
        id: string;
        name: string | null;
        email: string;
    };
    token: string;
}

