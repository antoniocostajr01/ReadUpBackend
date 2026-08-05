import { SearchBookDTO } from '../../dtos/book.dto';
import { SupportedLanguage, toMarcLanguage } from './language';

/**
 * Cliente da Open Library (https://openlibrary.org/developers/api). Sem key, sem quota.
 *
 * A diferença que motivou a troca do Google Books: a OL indexa OBRAS, não edições.
 * Uma busca por "harry potter" devolve os sete livros da série, não cada reimpressão,
 * resumo e guia de estudo. E `readinglog_count` (quantas pessoas têm o livro na
 * estante) é o sinal de popularidade que separa a obra do derivado.
 */

const SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
const COVER_ENDPOINT = 'https://covers.openlibrary.org/b/id';

// Só os campos que usamos: resposta menor, busca mais rápida.
const SEARCH_FIELDS = [
    'key',
    'title',
    'author_name',
    'cover_i',
    'number_of_pages_median',
    'readinglog_count',
    'first_publish_year',
    'description',
    'language',
].join(',');

// Acima disso, um resultado é "conhecido"; abaixo do outro, é ruído.
const POPULAR_THRESHOLD = 50;
const OBSCURE_THRESHOLD = 5;

export interface OpenLibraryDoc {
    key: string;
    title?: string;
    author_name?: string[];
    cover_i?: number;
    number_of_pages_median?: number;
    readinglog_count?: number;
    first_publish_year?: number;
    // A OL devolve ora string, ora { type, value }.
    description?: string | { value?: string };
    language?: string[];
}

interface SearchResponse {
    docs?: OpenLibraryDoc[];
}

/**
 * Corta o ruído em três regras. Nada de score composto: a OL já ordena por
 * relevância, e reconstruir o ranking dela por fora foi exatamente o erro que
 * tornou a busca antiga ruim.
 */
export function filterDocs(docs: OpenLibraryDoc[]): OpenLibraryDoc[] {
    const usable = docs.filter(doc =>
        Boolean(doc.title) &&
        Boolean(doc.author_name && doc.author_name.length > 0) &&
        typeof doc.cover_i === 'number'
    );

    // Se a busca tem algum resultado claramente popular, os quase-desconhecidos são
    // derivados (fanfic, resumo, edição genérica). Sem nenhum popular não há base de
    // comparação — pode ser um livro de nicho legítimo — e mantemos tudo.
    const hasPopular = usable.some(doc => (doc.readinglog_count ?? 0) >= POPULAR_THRESHOLD);
    if (!hasPopular) return usable;

    return usable.filter(doc => (doc.readinglog_count ?? 0) >= OBSCURE_THRESHOLD);
}

function descriptionText(description: OpenLibraryDoc['description']): string | null {
    if (!description) return null;
    const text = typeof description === 'string' ? description : description.value;
    const trimmed = text?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function workIdFromKey(key: string): string {
    return key.replace('/works/', '');
}

export function coverUrlFor(coverId?: number): string | null {
    return typeof coverId === 'number' ? `${COVER_ENDPOINT}/${coverId}-M.jpg` : null;
}

export function toDTO(doc: OpenLibraryDoc): SearchBookDTO {
    return {
        id: workIdFromKey(doc.key),
        title: doc.title ?? 'Untitled',
        author: doc.author_name?.join(', ') ?? null,
        totalPages: doc.number_of_pages_median ?? 0,
        details: descriptionText(doc.description),
        coverUrl: coverUrlFor(doc.cover_i),
        // A obra existe em vários idiomas; quem manda no rótulo é o idioma pedido,
        // resolvido pelo serviço. Aqui devolvemos o primeiro conhecido só como dica.
        language: doc.language?.[0] ?? 'eng',
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : null,
    };
}

/** GET na OL devolvendo os docs; qualquer falha vira lista vazia (o serviço decide o fallback). */
async function fetchDocs(params: URLSearchParams): Promise<OpenLibraryDoc[]> {
    try {
        // URLSearchParams codifica espaço como "+"; trocamos por "%20" porque o
        // termo com aspas (ex.: subject:"science fiction") precisa decodificar de
        // volta com decodeURIComponent, que não entende "+" como espaço.
        const query = params.toString().replace(/\+/g, '%20');
        const response = await fetch(`${SEARCH_ENDPOINT}?${query}`);
        if (!response.ok) {
            console.error('Open Library error:', response.status);
            return [];
        }
        const data = (await response.json()) as SearchResponse;
        return data.docs ?? [];
    } catch (error) {
        console.error('Open Library unreachable:', error);
        return [];
    }
}

export async function searchWorks(
    query: string,
    lang: SupportedLanguage,
    limit: number,
    offset: number
): Promise<OpenLibraryDoc[]> {
    return fetchDocs(new URLSearchParams({
        q: query,
        language: toMarcLanguage(lang),
        fields: SEARCH_FIELDS,
        limit: String(limit),
        offset: String(offset),
    }));
}

export async function browseSubject(
    subject: string,
    lang: SupportedLanguage,
    limit: number
): Promise<OpenLibraryDoc[]> {
    // Assunto com espaço precisa de aspas, senão a OL quebra em dois termos soltos.
    const term = subject.includes(' ') ? `"${subject}"` : subject;
    return fetchDocs(new URLSearchParams({
        q: `subject:${term}`,
        // Popularidade em vez de relevância: numa vitrine de gênero o usuário quer os
        // livros que as pessoas realmente leem, não o match textual mais próximo.
        sort: 'readinglog',
        language: toMarcLanguage(lang),
        fields: SEARCH_FIELDS,
        limit: String(limit),
    }));
}
