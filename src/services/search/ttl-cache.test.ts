import { test, mock } from 'node:test';
import assert from 'node:assert';
import { TtlCache } from './ttl-cache';

test('devolve o valor guardado antes do TTL vencer', () => {
    const cache = new TtlCache<string>(1000);
    cache.set('k', 'v');
    assert.equal(cache.get('k'), 'v');
});

test('descarta o valor depois do TTL vencer', () => {
    mock.timers.enable({ apis: ['Date'] });
    const cache = new TtlCache<string>(1000);
    cache.set('k', 'v');
    mock.timers.tick(1000);
    assert.equal(cache.get('k'), undefined);
    mock.timers.reset();
});

test('devolve undefined para chave que nunca foi guardada', () => {
    const cache = new TtlCache<string>(1000);
    assert.equal(cache.get('ausente'), undefined);
});
