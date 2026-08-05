import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import {
    filterDocs,
    toDTO,
    searchWorks,
    browseSubject,
    localizedEdition,
    OpenLibraryDoc,
} from './openlibrary.provider';

/** Doc mínimo válido; cada teste sobrescreve só o que interessa. */
function doc(overrides: Partial<OpenLibraryDoc> = {}): OpenLibraryDoc {
    return {
        key: '/works/OL1W',
        title: 'Um Livro',
        author_name: ['Alguém'],
        cover_i: 123,
        readinglog_count: 100,
        ...overrides,
    };
}

/** Troca o fetch global por um que devolve `body`, e registra as URLs chamadas. */
function stubFetch(body: unknown): { urls: string[] } {
    const urls: string[] = [];
    mock.method(globalThis, 'fetch', async (url: string) => {
        urls.push(String(url));
        return new Response(JSON.stringify(body), { status: 200 });
    });
    return { urls };
}

afterEach(() => mock.restoreAll());

test('descarta resultado sem autor', () => {
    const kept = filterDocs([doc(), doc({ key: '/works/OL2W', author_name: undefined })]);
    assert.equal(kept.length, 1);
    assert.equal(kept[0].key, '/works/OL1W');
});

test('descarta resultado sem capa', () => {
    const kept = filterDocs([doc(), doc({ key: '/works/OL2W', cover_i: undefined })]);
    assert.equal(kept.length, 1);
});

test('descarta obscuro quando existe um resultado popular', () => {
    const kept = filterDocs([
        doc({ key: '/works/OL1W', readinglog_count: 5000 }),
        doc({ key: '/works/OL2W', readinglog_count: 2 }),
    ]);
    assert.deepEqual(kept.map(d => d.key), ['/works/OL1W']);
});

test('mantém todos quando nenhum resultado é popular — sem base de comparação', () => {
    const kept = filterDocs([
        doc({ key: '/works/OL1W', readinglog_count: 4 }),
        doc({ key: '/works/OL2W', readinglog_count: 2 }),
    ]);
    assert.equal(kept.length, 2);
});

test('converte doc em DTO com id sem o prefixo /works/', () => {
    const dto = toDTO(doc({
        key: '/works/OL82563W',
        title: 'Harry Potter and the Philosopher\'s Stone',
        author_name: ['J. K. Rowling', 'Mary GrandPré'],
        cover_i: 15155833,
        number_of_pages_median: 302,
        first_publish_year: 1997,
        description: 'Uma sinopse.',
        language: ['por', 'eng'],
    }));

    assert.equal(dto.id, 'OL82563W');
    assert.equal(dto.author, 'J. K. Rowling, Mary GrandPré');
    assert.equal(dto.totalPages, 302);
    assert.equal(dto.publishedDate, '1997');
    assert.equal(dto.details, 'Uma sinopse.');
    assert.equal(dto.coverUrl, 'https://covers.openlibrary.org/b/id/15155833-M.jpg');
});

test('aceita description no formato objeto que a OL às vezes devolve', () => {
    const description = { type: '/type/text', value: 'Texto.' } as OpenLibraryDoc['description'];
    const dto = toDTO(doc({ description }));
    assert.equal(dto.details, 'Texto.');
});

test('DTO sobrevive a doc sem páginas, sem ano e sem sinopse', () => {
    const dto = toDTO(doc({
        number_of_pages_median: undefined,
        first_publish_year: undefined,
        description: undefined,
    }));
    assert.equal(dto.totalPages, 0);
    assert.equal(dto.publishedDate, null);
    assert.equal(dto.details, null);
});

test('searchWorks pede os campos certos e filtra por idioma MARC', async () => {
    const { urls } = stubFetch({ docs: [doc()] });
    await searchWorks('harry potter', 'pt', 20, 0);

    const url = urls[0];
    assert.ok(url.startsWith('https://openlibrary.org/search.json?'));
    assert.ok(url.includes('language=por'));
    assert.ok(url.includes('limit=20'));
    assert.ok(url.includes('offset=0'));
    assert.ok(url.includes('readinglog_count'));
    assert.ok(url.includes('description'));
});

test('browseSubject ordena por readinglog e cita assunto com espaço', async () => {
    const { urls } = stubFetch({ docs: [doc()] });
    await browseSubject('science fiction', 'en', 12);

    const url = decodeURIComponent(urls[0]);
    assert.ok(url.includes('sort=readinglog'));
    assert.ok(url.includes('subject:"science fiction"'));
    assert.ok(url.includes('language=eng'));
});

test('devolve lista vazia quando a Open Library responde erro', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('boom', { status: 500 }));
    assert.deepEqual(await searchWorks('qualquer', 'pt', 20, 0), []);
});

test('devolve lista vazia quando o fetch lança', async () => {
    mock.method(globalThis, 'fetch', async () => { throw new Error('offline'); });
    assert.deepEqual(await searchWorks('qualquer', 'pt', 20, 0), []);
});

test('localizedEdition escolhe a primeira edição no idioma pedido', async () => {
    const { urls } = stubFetch({
        entries: [
            { title: 'Harry Potter and the Sorcerer\'s Stone', languages: [{ key: '/languages/eng' }], covers: [1], number_of_pages: 309 },
            { title: 'Harry Potter e a Pedra Filosofal', languages: [{ key: '/languages/por' }], covers: [42], number_of_pages: 264 },
        ],
    });

    const edition = await localizedEdition('OL82563W', 'pt');

    assert.ok(urls[0].includes('/works/OL82563W/editions.json'));
    assert.equal(edition?.title, 'Harry Potter e a Pedra Filosofal');
    assert.equal(edition?.coverUrl, 'https://covers.openlibrary.org/b/id/42-M.jpg');
    assert.equal(edition?.totalPages, 264);
});

test('localizedEdition devolve null quando não há edição no idioma', async () => {
    stubFetch({
        entries: [
            { title: 'Only English', languages: [{ key: '/languages/eng' }], covers: [1] },
        ],
    });
    assert.equal(await localizedEdition('OL1W', 'pt'), null);
});

test('localizedEdition ignora edição sem título', async () => {
    stubFetch({
        entries: [
            { languages: [{ key: '/languages/por' }], covers: [1] },
            { title: 'Título Válido', languages: [{ key: '/languages/por' }], covers: [2] },
        ],
    });
    const edition = await localizedEdition('OL1W', 'pt');
    assert.equal(edition?.title, 'Título Válido');
});

test('localizedEdition tolera edição sem capa e sem páginas', async () => {
    stubFetch({
        entries: [{ title: 'Sem Nada', languages: [{ key: '/languages/por' }] }],
    });
    const edition = await localizedEdition('OL1W', 'pt');
    assert.equal(edition?.coverUrl, null);
    assert.equal(edition?.totalPages, null);
});

test('localizedEdition devolve null quando a Open Library falha', async () => {
    mock.method(globalThis, 'fetch', async () => new Response('boom', { status: 500 }));
    assert.equal(await localizedEdition('OL1W', 'pt'), null);
});
