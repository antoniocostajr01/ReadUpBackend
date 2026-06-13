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
        genres: string[];
    };
    token: string;
}

export interface AppleLoginRequestDTO {
    identityToken: string;
    fullName?: string;
    email?: string;
}

export interface ForgotPasswordRequestDTO {
    email: string;
}

export interface ResetPasswordRequestDTO {
    email: string;
    code: string;
    newPassword: string;
}

