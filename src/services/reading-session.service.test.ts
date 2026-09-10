import { test } from 'node:test';
import assert from 'node:assert';
import { validateCreateSessionInput } from './reading-session.service';

const base = { bookId: 'b1', pagesRead: 10, readingTimeSeconds: 60 };

test('aceita dados válidos sem date', () => {
    assert.doesNotThrow(() => validateCreateSessionInput({ ...base }));
});

test('aceita date válida no passado', () => {
    assert.doesNotThrow(() =>
        validateCreateSessionInput({ ...base, date: new Date(Date.now() - 1000).toISOString() })
    );
});

test('rejeita pagesRead ausente', () => {
    const { pagesRead, ...rest } = base;
    assert.throws(() => validateCreateSessionInput(rest as any), /Invalid pagesRead/);
});

test('rejeita pagesRead negativo', () => {
    assert.throws(() => validateCreateSessionInput({ ...base, pagesRead: -1 }), /Invalid pagesRead/);
});

test('rejeita pagesRead não inteiro', () => {
    assert.throws(() => validateCreateSessionInput({ ...base, pagesRead: 1.5 }), /Invalid pagesRead/);
});

test('rejeita readingTimeSeconds ausente', () => {
    const { readingTimeSeconds, ...rest } = base;
    assert.throws(() => validateCreateSessionInput(rest as any), /Invalid readingTimeSeconds/);
});

test('rejeita readingTimeSeconds negativo', () => {
    assert.throws(
        () => validateCreateSessionInput({ ...base, readingTimeSeconds: -1 }),
        /Invalid readingTimeSeconds/
    );
});

test('rejeita date inválida', () => {
    assert.throws(() => validateCreateSessionInput({ ...base, date: 'não é data' }), /Invalid date/);
});

test('rejeita date no futuro', () => {
    assert.throws(
        () => validateCreateSessionInput({ ...base, date: new Date(Date.now() + 60_000).toISOString() }),
        /Date cannot be in the future/
    );
});
