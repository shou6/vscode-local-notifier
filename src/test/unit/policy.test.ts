import * as assert from 'assert';
import { claimedName, isCandidate, isStale, MAX_AGE_MS } from '../../inbox/policy';

suite('isCandidate', () => {
  test('.json で終わるファイルだけを通知の候補にする', () => {
    assert.strictEqual(isCandidate('1695300000-123.json'), true);
    assert.strictEqual(isCandidate('note.txt'), false);
    assert.strictEqual(isCandidate('.gitignore'), false);
  });

  test('. で始まるファイルは候補にしない（書きかけの一時ファイルと、取り合いで確保したファイル）', () => {
    assert.strictEqual(isCandidate('.tmp-123.json'), false);
    assert.strictEqual(isCandidate(claimedName('a.json', 'w1')), false);
  });

  test('大文字の拡張子も候補にする', () => {
    assert.strictEqual(isCandidate('A.JSON'), true);
  });
});

suite('claimedName', () => {
  test('ウィンドウごとの識別子を入れた、候補にならない名前にする', () => {
    assert.strictEqual(claimedName('a.json', 'w1'), '.claimed-w1-a.json');
  });
});

suite('isStale', () => {
  const now = 1_000_000_000;

  test('上限より古いファイルは古い（VS Code を閉じていた間に溜まったもの）', () => {
    assert.strictEqual(isStale(now - MAX_AGE_MS - 1, now), true);
  });

  test('上限までの古さなら通知する', () => {
    assert.strictEqual(isStale(now - MAX_AGE_MS, now), false);
    assert.strictEqual(isStale(now, now), false);
  });

  test('時計のずれで未来の時刻になっていても通知する', () => {
    assert.strictEqual(isStale(now + 60_000, now), false);
  });
});
