import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import type { LocalNotifierApi } from '../../extension';

// out/test/integration から見たプロジェクトルート
const ROOT = path.resolve(__dirname, '../../..');

interface Manifest {
  name: string;
  publisher: string;
  contributes?: { commands?: { command: string }[] };
}

function readManifest(): Manifest {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as Manifest;
}

function extensionId(): string {
  const manifest = readManifest();
  return manifest.publisher + '.' + manifest.name;
}

suite('Extension', () => {
  test('拡張機能が読み込まれ、有効化できる', async () => {
    const extension = vscode.extensions.getExtension(extensionId());
    assert.ok(extension, '拡張機能が見つからない: ' + extensionId());
    await extension.activate();
    assert.strictEqual(extension.isActive, true);
  });

  test('package.json に書いたコマンドが、すべて登録されている', async () => {
    await vscode.extensions.getExtension(extensionId())?.activate();
    const registered = await vscode.commands.getCommands(true);
    const declared = (readManifest().contributes?.commands ?? []).map((c) => c.command);
    assert.ok(declared.length > 0, 'package.json にコマンドが無い');
    assert.deepStrictEqual(
      declared.filter((command) => !registered.includes(command)),
      [],
      '登録されていないコマンド'
    );
  });

  test('テスト通知を送ると、受信箱のファイルが見張りに拾われて消える', async () => {
    const extension = vscode.extensions.getExtension<LocalNotifierApi>(extensionId());
    assert.ok(extension);
    const api = await extension.activate();
    const inboxes = await api.inboxes();
    assert.ok(inboxes.length > 0, '見張っている受信箱が無い');

    await vscode.commands.executeCommand('localNotifier.sendTestNotification');

    // 通知を出す PowerShell の起動を含めても、数秒で処理が終わる
    const deadline = Date.now() + 10_000;
    let remaining: string[] = [];
    do {
      await new Promise((resolve) => setTimeout(resolve, 200));
      const entries = await vscode.workspace.fs.readDirectory(inboxes[0].uri);
      remaining = entries.map(([name]) => name).filter((name) => !name.startsWith('.'));
    } while (remaining.length > 0 && Date.now() < deadline);
    assert.deepStrictEqual(remaining, []);
  });

  test('ローカル側（UI 側）で動く拡張として宣言している', () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      extensionKind?: string[];
    };
    assert.deepStrictEqual(manifest.extensionKind, ['ui']);
  });
});
