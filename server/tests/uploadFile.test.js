import test from 'node:test';
import assert from 'node:assert/strict';
import { getUploadedFile } from '../utils/getUploadedFile.js';

test('returns avatar file when request uses avatar field', () => {
  const req = {
    files: {
      avatar: {
        name: 'avatar.png',
        tempFilePath: '/tmp/avatar.png',
      },
    },
  };

  assert.deepEqual(getUploadedFile(req), req.files.avatar);
});

test('returns file when request uses file field', () => {
  const req = {
    files: {
      file: {
        name: 'profile.png',
        tempFilePath: '/tmp/profile.png',
      },
    },
  };

  assert.deepEqual(getUploadedFile(req), req.files.file);
});

test('returns null when no valid upload is present', () => {
  assert.equal(getUploadedFile({}), null);
  assert.equal(getUploadedFile({ files: {} }), null);
});
