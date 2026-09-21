import * as assert from 'assert';
import { resultMessage, testNotification } from '../../message/testNotification';

/** 翻訳はせず、{0} などの差し込みだけを行う。vscode.l10n.t の代わりに渡す */
function t(message: string, ...args: string[]): string {
  return message.replace(/\{(\d+)\}/g, (_, index: string) => args[Number(index)] ?? '');
}

suite('testNotification', () => {
  test('フォルダを開いている時は、その名前をプロジェクト名にする', () => {
    assert.deepStrictEqual(testNotification(t, 'sample'), {
      title: 'Local Notifier',
      message: 'This is a test notification.',
      project: 'sample',
      level: 'info',
      source: 'VS Code',
    });
  });

  test('フォルダを開いていない時は、プロジェクト名を入れない', () => {
    assert.strictEqual(testNotification(t, undefined).project, undefined);
  });
});

suite('resultMessage', () => {
  test('成功なら何も表示しない（トーストが出れば十分）', () => {
    assert.strictEqual(resultMessage(t, { ok: true }), undefined);
  });

  test('対応していない OS なら、Windows だけが対象だと伝える', () => {
    assert.strictEqual(
      resultMessage(t, { ok: false, reason: 'unsupported' }),
      'Desktop notifications are only supported on Windows.'
    );
  });

  test('失敗なら、原因を添えて伝える', () => {
    assert.strictEqual(
      resultMessage(t, { ok: false, reason: 'failed', detail: 'boom' }),
      'Failed to show the notification: boom'
    );
  });
});
