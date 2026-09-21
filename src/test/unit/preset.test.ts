import * as assert from 'assert';
import { builtInPresets, mergePresets } from '../../message/preset';

/** 翻訳はせず、{0} などの差し込みだけを行う。vscode.l10n.t の代わりに渡す */
function t(message: string, ...args: string[]): string {
  return message.replace(/\{(\d+)\}/g, (_, index: string) => args[Number(index)] ?? '');
}

suite('builtInPresets', () => {
  test('既定の定義は done、waiting、error の 3 つ', () => {
    assert.deepStrictEqual(Object.keys(builtInPresets(t)), ['done', 'waiting', 'error']);
  });

  test('それぞれ文面と種類を持つ', () => {
    assert.deepStrictEqual(builtInPresets(t), {
      done: {
        title: 'Task completed',
        message: 'The agent has finished its work.',
        level: 'success',
      },
      waiting: {
        title: 'Waiting for input',
        message: 'The agent is waiting for your input.',
        level: 'info',
      },
      error: {
        title: 'Stopped with an error',
        message: 'The agent stopped because of an error.',
        level: 'error',
      },
    });
  });
});

suite('mergePresets', () => {
  test('設定が空なら既定のまま', () => {
    const builtIn = builtInPresets(t);
    assert.deepStrictEqual(mergePresets(builtIn, {}), builtIn);
    assert.deepStrictEqual(mergePresets(builtIn, undefined), builtIn);
  });

  test('既定と同じ名前なら、書いた項目だけを上書きする', () => {
    const builtIn = builtInPresets(t);
    const merged = mergePresets(builtIn, { done: { message: 'ビルドが終わりました' } });
    assert.deepStrictEqual(merged.done, {
      title: 'Task completed',
      message: 'ビルドが終わりました',
      level: 'success',
    });
  });

  test('新しい名前なら定義を足す', () => {
    const builtIn = builtInPresets(t);
    const merged = mergePresets(builtIn, {
      review: { title: 'Review', message: 'Please review', level: 'warning', source: 'CI' },
    });
    assert.deepStrictEqual(merged.review, {
      title: 'Review',
      message: 'Please review',
      level: 'warning',
      source: 'CI',
    });
    assert.deepStrictEqual(Object.keys(merged), ['done', 'waiting', 'error', 'review']);
  });

  test('型の合わない項目、空白だけの文面、知らない level は無視する', () => {
    const builtIn = builtInPresets(t);
    const merged = mergePresets(builtIn, {
      done: { title: 1, message: '  ', level: 'fatal', source: null },
    });
    assert.deepStrictEqual(merged.done, builtIn.done);
  });

  test('オブジェクトでない定義と、設定そのものが壊れている時は無視する', () => {
    const builtIn = builtInPresets(t);
    assert.deepStrictEqual(mergePresets(builtIn, { done: 'text', extra: [] }), builtIn);
    assert.deepStrictEqual(mergePresets(builtIn, 'broken'), builtIn);
    assert.deepStrictEqual(mergePresets(builtIn, []), builtIn);
  });

  test('既定の定義を書き換えない', () => {
    const builtIn = builtInPresets(t);
    mergePresets(builtIn, { done: { title: 'Changed' } });
    assert.strictEqual(builtIn.done.title, 'Task completed');
  });
});
