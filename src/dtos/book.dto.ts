export interface CrateBookDTO {
    title: string;
    author: string;
    totalPages: number;
}


export interface BookResponseDTO {
    id: string;
    title: string;
    author: string
    totalPages: number;
    userId: string;
    createdAt: Date;
}