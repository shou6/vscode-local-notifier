import * as assert from 'assert';
import { POWERSHELL_APP_ID, toastAppId } from '../../notify/appId';

suite('toastAppId', () => {
  test('VS Code なら VS Code 自身の ID（送信元に Visual Studio Code と出る）', () => {
    assert.strictEqual(toastAppId('Visual Studio Code'), 'Microsoft.VisualStudioCode');
  });

  test('VS Code Insiders なら Insiders の ID', () => {
    assert.strictEqual(
      toastAppId('Visual Studio Code - Insiders'),
      'Microsoft.VisualStudioCode.Insiders'
    );
  });

  test('知らないエディターなら Windows PowerShell の ID', () => {
    assert.strictEqual(toastAppId('Some Other Editor'), POWERSHELL_APP_ID);
  });
});
