import * as assert from 'assert';
import { encodePowerShellCommand, TOAST_SCRIPT, toastInput } from '../../notify/script';

suite('TOAST_SCRIPT', () => {
  test('WinRT のトーストを使い、内容は標準入力から読む', () => {
    assert.match(TOAST_SCRIPT, /Windows\.UI\.Notifications\.ToastNotificationManager/);
    assert.match(TOAST_SCRIPT, /\[Console\]::In\.ReadToEnd\(\)/);
  });

  test('進捗の表示を止めている（標準エラーに CLIXML が混ざるため）', () => {
    assert.match(TOAST_SCRIPT, /\$ProgressPreference\s*=\s*'SilentlyContinue'/);
  });

  test('標準入力を UTF-8 として読む（日本語が化けないように）', () => {
    assert.match(TOAST_SCRIPT, /InputEncoding\s*=\s*\[System\.Text\.Encoding\]::UTF8/);
  });
});

suite('encodePowerShellCommand', () => {
  test('UTF-16LE の Base64 にする（-EncodedCommand の形式）', () => {
    const encoded = encodePowerShellCommand("Write-Output 'あ'");
    assert.strictEqual(Buffer.from(encoded, 'base64').toString('utf16le'), "Write-Output 'あ'");
  });
});

suite('toastInput', () => {
  test('スクリプトが読む JSON にする。特殊な文字もそのまま往復する', () => {
    const content = {
      title: '"引用符" $HOME `x`',
      body: "本文 <tag> & 'single'\n2 行目",
      attribution: 'app · CI',
    };
    const parsed = JSON.parse(toastInput(content, 'Microsoft.VisualStudioCode')) as unknown;
    assert.deepStrictEqual(parsed, { appId: 'Microsoft.VisualStudioCode', ...content });
  });
});
