import * as assert from 'assert';
import { StatusInput, statusRows } from '../../status/report';

/** 翻訳はせず、{0} などの差し込みだけを行う。vscode.l10n.t の代わりに渡す */
function t(message: string, ...args: string[]): string {
  return message.replace(/\{(\d+)\}/g, (_, index: string) => args[Number(index)] ?? '');
}

const BASE: StatusInput = {
  platform: 'win32',
  remoteName: undefined,
  enabled: true,
  inboxes: [],
  lastToast: undefined,
};

suite('statusRows', () => {
  test('Windows で有効なら、通知を出せる状態として示す', () => {
    const rows = statusRows(t, BASE);
    assert.deepStrictEqual(rows[0], {
      label: 'Desktop notifications: available',
      problem: false,
    });
  });

  test('Windows 以外では、問題として示す', () => {
    const rows = statusRows(t, { ...BASE, platform: 'linux' });
    assert.deepStrictEqual(rows[0], {
      label: 'Desktop notifications: only supported on Windows',
      problem: true,
    });
  });

  test('通知を無効にしていれば、問題として示す', () => {
    const rows = statusRows(t, { ...BASE, enabled: false });
    assert.deepStrictEqual(rows[0], {
      label: 'Desktop notifications: disabled by "localNotifier.enabled"',
      problem: true,
    });
  });

  test('このウィンドウで最後に出した通知の結果を示す', () => {
    const label = (lastToast: StatusInput['lastToast']): string =>
      statusRows(t, { ...BASE, lastToast })[1].label;
    assert.strictEqual(label(undefined), 'Last notification: none in this window yet');
    assert.strictEqual(label({ ok: true }), 'Last notification: shown');
    assert.strictEqual(
      label({ ok: false, reason: 'failed', detail: 'boom' }),
      'Last notification: failed (boom)'
    );
  });

  test('最後の通知が失敗していれば、問題として示す', () => {
    const rows = statusRows(t, {
      ...BASE,
      lastToast: { ok: false, reason: 'failed', detail: 'boom' },
    });
    assert.strictEqual(rows[1].problem, true);
  });

  test('接続先の種類を示す', () => {
    const label = (remoteName: string | undefined): string =>
      statusRows(t, { ...BASE, remoteName })[2].label;
    assert.strictEqual(label(undefined), 'Window: local');
    assert.strictEqual(label('wsl'), 'Window: WSL');
    assert.strictEqual(label('dev-container'), 'Window: Dev Container');
    assert.strictEqual(label('ssh-remote'), 'Window: ssh-remote (not supported)');
  });

  test('見張っている受信箱を、種類と場所と確認の方法つきで示す', () => {
    const rows = statusRows(t, {
      ...BASE,
      remoteName: 'wsl',
      inboxes: [
        { kind: 'globalStorage', path: 'C:\\g\\inbox', poll: true },
        { kind: 'workspaceStorage', path: 'C:\\w\\inbox', poll: true, project: 'app' },
      ],
    });
    assert.deepStrictEqual(rows.slice(3), [
      {
        label: 'Inbox for all workspaces',
        description: 'watched, and checked every 2 seconds',
        detail: 'C:\\g\\inbox',
        problem: false,
      },
      {
        label: 'Inbox for this workspace (app)',
        description: 'watched, and checked every 2 seconds',
        detail: 'C:\\w\\inbox',
        problem: false,
      },
    ]);
  });

  test('設定で指定した受信箱と、Dev Container の受信箱も示す。定期的な確認が無ければそう示す', () => {
    const rows = statusRows(t, {
      ...BASE,
      inboxes: [
        { kind: 'path', path: 'D:\\x', poll: false },
        {
          kind: 'workspace',
          path: '/workspace/.devcontainer/.local-notifier/inbox',
          poll: true,
          project: 'app',
        },
      ],
    });
    assert.deepStrictEqual(
      rows.slice(3).map((row) => [row.label, row.description]),
      [
        ['Inbox from "localNotifier.inboxPath"', 'watched'],
        ['Inbox for this Dev Container (app)', 'watched, and checked every 2 seconds'],
      ]
    );
  });

  test('有効なのに見張っている受信箱が無ければ、問題として示す', () => {
    const rows = statusRows(t, BASE);
    assert.deepStrictEqual(rows.slice(3), [{ label: 'No inbox is being watched', problem: true }]);
  });

  test('無効なら、受信箱が無くても問題にしない（無効の行で示しているため）', () => {
    const rows = statusRows(t, { ...BASE, enabled: false });
    assert.deepStrictEqual(rows.slice(3), []);
  });
});
