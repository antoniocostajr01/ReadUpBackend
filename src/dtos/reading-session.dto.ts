export interface CreateReadingSessionDTO {
    bookId: string;
    pagesRead: number;
    thoughts?: string;
    readingTimeSeconds: number;
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
