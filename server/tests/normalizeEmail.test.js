import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeEmail } from '../utils/normalizeEmail.js';

test('normalizes email by trimming and lowercasing', () => {
  assert.equal(normalizeEmail('  User@Example.COM  '), 'user@example.com');
});

test('returns empty string for missing email', () => {
  assert.equal(normalizeEmail(''), '');
});
