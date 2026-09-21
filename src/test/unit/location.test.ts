import * as assert from 'assert';
import { DEVCONTAINER_INBOX, inboxLocations } from '../../inbox/location';

suite('inboxLocations', () => {
  test('ローカルでは、拡張機能専用の保存フォルダの下の受信箱だけを見張る', () => {
    const locations = inboxLocations({ remoteName: undefined, folders: ['app'], inboxPath: '' });
    assert.deepStrictEqual(locations, [{ kind: 'globalStorage' }]);
  });

  test('WSL でも、Windows 側の保存フォルダの下の受信箱を見張る（WSL からは /mnt/c で書く）', () => {
    const locations = inboxLocations({ remoteName: 'wsl', folders: ['app'], inboxPath: '' });
    assert.deepStrictEqual(locations, [{ kind: 'globalStorage' }]);
  });

  test('Dev Container では、各ワークスペースフォルダの .devcontainer の下も見張る', () => {
    const locations = inboxLocations({
      remoteName: 'dev-container',
      folders: ['app', 'lib'],
      inboxPath: '',
    });
    assert.deepStrictEqual(locations, [
      { kind: 'globalStorage' },
      { kind: 'workspace', folderIndex: 0, project: 'app' },
      { kind: 'workspace', folderIndex: 1, project: 'lib' },
    ]);
  });

  test('設定で場所を指定したら、保存フォルダの代わりにそこを見張る', () => {
    const locations = inboxLocations({
      remoteName: 'dev-container',
      folders: ['app'],
      inboxPath: 'C:\\inbox',
    });
    assert.deepStrictEqual(locations, [
      { kind: 'path', path: 'C:\\inbox' },
      { kind: 'workspace', folderIndex: 0, project: 'app' },
    ]);
  });

  test('設定の前後の空白は無視し、空白だけなら未設定として扱う', () => {
    const locations = inboxLocations({ remoteName: undefined, folders: [], inboxPath: '   ' });
    assert.deepStrictEqual(locations, [{ kind: 'globalStorage' }]);
    const trimmed = inboxLocations({ remoteName: undefined, folders: [], inboxPath: ' D:\\x ' });
    assert.deepStrictEqual(trimmed, [{ kind: 'path', path: 'D:\\x' }]);
  });

  test('.devcontainer の下の受信箱の相対パス', () => {
    assert.deepStrictEqual(DEVCONTAINER_INBOX, ['.devcontainer', '.local-notifier', 'inbox']);
  });
});
