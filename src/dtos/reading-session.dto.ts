export interface CreateReadingSessionDTO {
    bookId: string;
    pagesRead: number;
    thoughts?: string;
    readingTimeSeconds: number;
    // ISO8601. Só vem preenchido ao reenviar uma sessão que ficou pendente no
    // app (offline); um save normal deixa o backend carimbar a data.
    date?: string;
}

export interface UpdateReadingSessionDTO {
    pagesRead?: number;
    thoughts?: string;
    readingTimeSeconds?: number;
}

export interface ReadingSessionResponseDTO {
    id: string;
    userId: string;
    bookId: string;
    pagesRead: number;
    thoughts: string | null;
    readingTimeSeconds: number;
    date: Date;
}
