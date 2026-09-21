import * as assert from 'assert';
import {
  DEVCONTAINER_INBOX,
  inboxLocations,
  needsPolling,
  POLL_INTERVAL_MS,
} from '../../inbox/location';

suite('inboxLocations', () => {
  test('ローカルでは、すべてのワークスペース用の受信箱と、このワークスペース用の受信箱を見張る', () => {
    const locations = inboxLocations({
      remoteName: undefined,
      folders: ['app'],
      inboxPath: '',
      workspaceStorage: true,
    });
    assert.deepStrictEqual(locations, [
      { kind: 'globalStorage' },
      { kind: 'workspaceStorage', project: 'app' },
    ]);
  });

  test('WSL でも同じ。どちらも Windows 側にあり、WSL からは /mnt/c で書く', () => {
    const locations = inboxLocations({
      remoteName: 'wsl',
      folders: ['app'],
      inboxPath: '',
      workspaceStorage: true,
    });
    assert.deepStrictEqual(locations, [
      { kind: 'globalStorage' },
      { kind: 'workspaceStorage', project: 'app' },
    ]);
  });

  test('フォルダを開いていない（ワークスペース用の保存フォルダが無い）時は、すべてのワークスペース用だけ', () => {
    const locations = inboxLocations({
      remoteName: undefined,
      folders: [],
      inboxPath: '',
      workspaceStorage: false,
    });
    assert.deepStrictEqual(locations, [{ kind: 'globalStorage' }]);
  });

  test('Dev Container では、ワークスペース用の保存フォルダではなく、各フォルダの .devcontainer の下を見張る', () => {
    const locations = inboxLocations({
      remoteName: 'dev-container',
      folders: ['app', 'lib'],
      inboxPath: '',
      workspaceStorage: true,
    });
    assert.deepStrictEqual(locations, [
      { kind: 'globalStorage' },
      { kind: 'workspace', folderIndex: 0, project: 'app' },
      { kind: 'workspace', folderIndex: 1, project: 'lib' },
    ]);
  });

  test('SSH など、ほかのリモートでは、すべてのワークスペース用だけ', () => {
    const locations = inboxLocations({
      remoteName: 'ssh-remote',
      folders: ['app'],
      inboxPath: '',
      workspaceStorage: true,
    });
    assert.deepStrictEqual(locations, [{ kind: 'globalStorage' }]);
  });

  test('設定で場所を指定したら、すべてのワークスペース用の受信箱の代わりにそこを見張る', () => {
    const locations = inboxLocations({
      remoteName: 'dev-container',
      folders: ['app'],
      inboxPath: 'C:\\inbox',
      workspaceStorage: true,
    });
    assert.deepStrictEqual(locations, [
      { kind: 'path', path: 'C:\\inbox' },
      { kind: 'workspace', folderIndex: 0, project: 'app' },
    ]);
  });

  test('設定の前後の空白は無視し、空白だけなら未設定として扱う', () => {
    const input = { remoteName: undefined, folders: [], workspaceStorage: false };
    assert.deepStrictEqual(inboxLocations({ ...input, inboxPath: '   ' }), [
      { kind: 'globalStorage' },
    ]);
    assert.deepStrictEqual(inboxLocations({ ...input, inboxPath: ' D:\\x ' }), [
      { kind: 'path', path: 'D:\\x' },
    ]);
  });

  test('.devcontainer の下の受信箱だけ、定期的にも確認する（コンテナでは変更の知らせが届かないため）', () => {
    assert.strictEqual(needsPolling({ kind: 'workspace', folderIndex: 0, project: 'app' }), true);
    assert.strictEqual(needsPolling({ kind: 'workspaceStorage', project: 'app' }), false);
    assert.strictEqual(needsPolling({ kind: 'globalStorage' }), false);
    assert.strictEqual(needsPolling({ kind: 'path', path: 'C:\\inbox' }), false);
  });

  test('定期的な確認の間隔は、通知の遅れの目安の 2 秒', () => {
    assert.strictEqual(POLL_INTERVAL_MS, 2000);
  });

  test('.devcontainer の下の受信箱の相対パス', () => {
    assert.deepStrictEqual(DEVCONTAINER_INBOX, ['.devcontainer', '.local-notifier', 'inbox']);
  });
});
