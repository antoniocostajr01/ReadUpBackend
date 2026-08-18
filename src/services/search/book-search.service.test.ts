import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert';
import { BookSearchService } from './book-search.service';

afterEach(() => mock.restoreAll());

/**
 * Stub de fetch por rota. Cada chamada escolhe a resposta pelo trecho da URL,
 * porque um search dispara search.json e várias editions.json.
 */
function stubRoutes(routes: { match: string; body: unknown; status?: number }[]): { urls: string[] } {
    const urls: string[] = [];
    mock.method(globalThis, 'fetch', async (url: string) => {
        const target = String(url);
        urls.push(target);
        const route = routes.find(r => target.includes(r.match));
        if (!route) return new Response('{}', { status: 404 });
        return new Response(JSON.stringify(route.body), { status: route.status ?? 200 });
    });
    return { urls };
}

const HP_DOC = {
    key: '/works/OL82563W',
    title: 'Harry Potter and the Philosopher\'s Stone',
    author_name: ['J. K. Rowling'],
    cover_i: 15155833,
    number_of_pages_median: 302,
    readinglog_count: 23274,
    first_publish_year: 1997,
    description: 'Sinopse.',
};

const FANFIC_DOC = {
    key: '/works/OL999W',
    title: 'Harry Potter Fan Story',
    author_name: ['Anônimo'],
    cover_i: 5,
    readinglog_count: 1,
};

const PT_EDITIONS = {
    entries: [
        { title: 'Harry Potter e a Pedra Filosofal', languages: [{ key: '/languages/por' }], covers: [42], number_of_pages: 264 },
    ],
};

test('busca devolve a obra popular e corta o derivado obscuro', async () => {
    stubRoutes([
        { match: 'search.json', body: { docs: [HP_DOC, FANFIC_DOC] } },
        { match: 'editions.json', body: PT_EDITIONS },
    ]);

    const results = await new BookSearchService().search({ query: 'harry potter', lang: 'pt' });

    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'OL82563W');
});

test('busca em português substitui título e capa pela edição PT', async () => {
    stubRoutes([
        { match: 'search.json', body: { docs: [HP_DOC] } },
        { match: 'editions.json', body: PT_EDITIONS },
    ]);

    const results = await new BookSearchService().search({ query: 'harry potter', lang: 'pt' });

    assert.equal(results[0].title, 'Harry Potter e a Pedra Filosofal');
    assert.equal(results[0].coverUrl, 'https://covers.openlibrary.org/b/id/42-M.jpg');
    assert.equal(results[0].totalPages, 264);
});

test('mantém o dado da obra quando a edição PT não tem páginas', async () => {
    stubRoutes([
        { match: 'search.json', body: { docs: [HP_DOC] } },
        { match: 'editions.json', body: { entries: [{ title: 'Pedra Filosofal', languages: [{ key: '/languages/por' }] }] } },
    ]);

    const results = await new BookSearchService().search({ query: 'harry potter', lang: 'pt' });

    assert.equal(results[0].title, 'Pedra Filosofal');
    assert.equal(results[0].totalPages, 302, 'cai para number_of_pages_median da obra');
});

test('busca em inglês não chama editions.json', async () => {
    const { urls } = stubRoutes([{ match: 'search.json', body: { docs: [HP_DOC] } }]);

    await new BookSearchService().search({ query: 'harry potter', lang: 'en' });

    assert.equal(urls.filter(u => u.includes('editions.json')).length, 0);
});

test('cai no Google quando a Open Library não devolve nada', async () => {
    const { urls } = stubRoutes([
        { match: 'openlibrary.org/search.json', body: { docs: [] } },
        { match: 'googleapis.com', body: { items: [{ id: 'g1', volumeInfo: { title: 'Torto Arado', authors: ['Itamar Vieira Junior'], pageCount: 264 } }] } },
    ]);
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';

    const results = await new BookSearchService().search({ query: 'torto arado', lang: 'pt' });

    assert.ok(urls.some(u => u.includes('googleapis.com')));
    assert.equal(results[0].title, 'Torto Arado');
});

test('query com menos de dois caracteres não chama rede nenhuma', async () => {
    const { urls } = stubRoutes([{ match: 'search.json', body: { docs: [HP_DOC] } }]);

    const results = await new BookSearchService().search({ query: 'h', lang: 'pt' });

    assert.deepEqual(results, []);
    assert.equal(urls.length, 0);
});

test('browse por gênero usa cache na segunda chamada', async () => {
    const { urls } = stubRoutes([
        { match: 'search.json', body: { docs: [HP_DOC] } },
        { match: 'editions.json', body: PT_EDITIONS },
    ]);

    const service = new BookSearchService();
    await service.browse({ subject: 'fantasy', lang: 'pt' });
    const afterFirst = urls.length;
    await service.browse({ subject: 'fantasy', lang: 'pt' });

    assert.equal(urls.length, afterFirst, 'segunda chamada não bateu na rede');
});

test('browse aceita o prefixo subject: que o app já envia', async () => {
    const { urls } = stubRoutes([
        { match: 'search.json', body: { docs: [HP_DOC] } },
        { match: 'editions.json', body: PT_EDITIONS },
    ]);

    await new BookSearchService().browse({ subject: 'subject:fantasy', lang: 'pt' });

    const url = decodeURIComponent(urls[0]);
    assert.ok(url.includes('q=subject:fantasy'));
    assert.ok(!url.includes('subject:subject:'), 'prefixo não pode ser duplicado');
});

test('pede mais que o limite à OL, porque o filtro descarta parte', async () => {
    const { urls } = stubRoutes([
        { match: 'search.json', body: { docs: [HP_DOC] } },
        { match: 'editions.json', body: PT_EDITIONS },
    ]);

    await new BookSearchService().search({ query: 'harry potter', lang: 'pt', maxResults: 20 });

    assert.ok(urls[0].includes('limit=40'), 'sem sobrebusca a página sai curta e o scroll infinito para cedo');
});

test('respeita maxResults', async () => {
    const docs = Array.from({ length: 30 }, (_, i) => ({ ...HP_DOC, key: `/works/OL${i}W` }));
    stubRoutes([
        { match: 'search.json', body: { docs } },
        { match: 'editions.json', body: PT_EDITIONS },
    ]);

    const results = await new BookSearchService().search({ query: 'harry potter', lang: 'pt', maxResults: 5 });

    assert.equal(results.length, 5);
});

test('lookupIsbn usa a edição escaneada, não o canônico da obra', async () => {
    stubRoutes([
        { match: '/isbn/', body: { title: 'Harry Potter e a Pedra Filosofal', works: [{ key: '/works/OL82563W' }], number_of_pages: 264, covers: [42] } },
        { match: 'openlibrary.org/search.json', body: { docs: [HP_DOC] } },
    ]);

    const result = await new BookSearchService().lookupIsbn('9780747532699');

    assert.equal(result?.title, 'Harry Potter e a Pedra Filosofal');
    assert.equal(result?.totalPages, 264);
    assert.equal(result?.author, 'J. K. Rowling');
    assert.match(result?.coverUrl ?? '', /42-L\.jpg$/, 'detalhe pede capa L, não M');
});

test('lookupIsbn completa com o Google o que a Open Library deixa vazio', async () => {
    // Caso real: livro nacional que a OL indexa com capa mas sem páginas nem sinopse.
    stubRoutes([
        { match: '/isbn/', body: { title: 'Entendendo Algoritmos', works: [{ key: '/works/OL34952200W' }], covers: [13780321] } },
        { match: 'openlibrary.org/search.json', body: { docs: [{ key: '/works/OL34952200W', title: 'Entendendo Algoritmos', author_name: ['Aditya Y. Bhargava'], cover_i: 13780321 }] } },
        { match: 'googleapis.com', body: { items: [{ id: 'g1', volumeInfo: { title: 'Entendendo Algoritmos', pageCount: 264, description: 'Um guia ilustrado.', industryIdentifiers: [{ type: 'ISBN_13', identifier: '9788575225639' }] } }] } },
    ]);
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';

    const result = await new BookSearchService().lookupIsbn('9788575225639');

    delete process.env.GOOGLE_BOOKS_API_KEY;
    assert.equal(result?.totalPages, 264, 'páginas vieram do Google');
    assert.equal(result?.details, 'Um guia ilustrado.', 'sinopse veio do Google');
    assert.equal(result?.author, 'Aditya Y. Bhargava', 'autor continua o da Open Library');
    assert.match(result?.coverUrl ?? '', /13780321-L\.jpg$/, 'capa continua a da Open Library');
});

test('lookupIsbn acha no Google o que a Open Library não indexa', async () => {
    stubRoutes([
        { match: '/isbn/', body: {}, status: 404 },
        { match: 'googleapis.com', body: { items: [{ id: 'g1', volumeInfo: { title: 'Crime e Castigo', authors: ['Fiódor Dostoiévski'], pageCount: 592, imageLinks: { thumbnail: 'http://books.google.com/x&edge=curl' }, industryIdentifiers: [{ type: 'ISBN_13', identifier: '978-65-5888-148-3' }] } }] } },
    ]);
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';

    const result = await new BookSearchService().lookupIsbn('9786558881483');

    delete process.env.GOOGLE_BOOKS_API_KEY;
    assert.equal(result?.title, 'Crime e Castigo');
    assert.equal(result?.coverUrl, 'https://books.google.com/x');
});

test('lookupIsbn não aceita o vizinho difuso quando a edição não existe', async () => {
    // search.json?q=isbn: devolve obras que não são a do código de barras; quem resolve
    // o ISBN é /isbn/{isbn}.json, e 404 dele tem que virar null.
    const { urls } = stubRoutes([
        { match: '/isbn/', body: {}, status: 404 },
        { match: 'openlibrary.org/search.json', body: { docs: [HP_DOC] } },
    ]);

    const result = await new BookSearchService().lookupIsbn('9789999999991');

    assert.equal(result, null);
    assert.equal(urls.filter(url => url.includes('search.json')).length, 0);
});

test('lookupIsbn devolve null quando as duas bases vêm vazias', async () => {
    stubRoutes([
        { match: '/isbn/', body: {}, status: 404 },
        { match: 'googleapis.com', body: { items: [] } },
    ]);

    const result = await new BookSearchService().lookupIsbn('9780747532699');

    assert.equal(result, null);
});

test('lookupIsbn com ISBN malformado devolve null sem chamar rede', async () => {
    const { urls } = stubRoutes([{ match: '/isbn/', body: { works: [{ key: '/works/OL82563W' }] } }]);

    const result = await new BookSearchService().lookupIsbn('abc');

    assert.equal(result, null);
    assert.equal(urls.length, 0);
});

test('lookupIsbn com o mesmo ISBN duas vezes não bate na rede de novo', async () => {
    const { urls } = stubRoutes([
        { match: '/isbn/', body: { title: 'HP', works: [{ key: '/works/OL82563W' }] } },
        { match: 'openlibrary.org/search.json', body: { docs: [HP_DOC] } },
    ]);

    const service = new BookSearchService();
    await service.lookupIsbn('9780747532699');
    const afterFirst = urls.length;
    await service.lookupIsbn('9780747532699');

    assert.equal(urls.length, afterFirst, 'segunda chamada não bateu na rede');
});

test('lookupIsbn descarta o volume do Google que não declara o ISBN pedido', async () => {
    // `q=isbn:` do Google devolve um livro qualquer para ISBN inexistente — sem essa
    // checagem o scanner adicionaria um livro que o usuário nunca escaneou.
    stubRoutes([
        { match: '/isbn/', body: {}, status: 404 },
        { match: 'googleapis.com', body: { items: [{ id: 'g9', volumeInfo: { title: 'Livro Aleatório', industryIdentifiers: [{ type: 'ISBN_13', identifier: '9780306406157' }] } }] } },
    ]);
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';

    const result = await new BookSearchService().lookupIsbn('9781111111119');

    delete process.env.GOOGLE_BOOKS_API_KEY;
    assert.equal(result, null);
});
