import { BookStatus } from "@prisma/client";

export interface CreateBookDTO {
    title: string;
    author?: string;
    totalPages: number;
    details?: string;
    coverUrl?: string;
}

export interface UpdateBookDTO {
    title?: string;
    author?: string;
    totalPages?: number;
    details?: string;
    coverUrl?: string;
    status?: BookStatus;
    progress?: number;
}

/** Resultado de busca de livro. Espelha o `SearchBook` do app. */
export interface SearchBookDTO {
    id: string;
    title: string;
    author: string | null;
    totalPages: number;
    details: string | null;
    coverUrl: string | null;
    language: string;
    publishedDate: string | null;
}

export interface BookResponseDTO {
    id: string;
    title: string;
    author: string | null;
    totalPages: number;
    details: string | null;
    coverUrl: string | null;
    status: BookStatus;
    progress: number;
    userId: string;
    createdAt: Date;
}
