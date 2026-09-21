import * as assert from 'assert';
import { createNotifier } from '../../notify/notifier';
import { encodePowerShellCommand, TOAST_SCRIPT } from '../../notify/script';
import { ProcessResult, ProcessRunner } from '../../platform/process';

interface Call {
  command: string;
  args: string[];
  stdin: string;
}

/** 呼び出しを記録し、決めた結果を返すフェイク */
function fakeRunner(result: ProcessResult | Error): { runner: ProcessRunner; calls: Call[] } {
  const calls: Call[] = [];
  const runner: ProcessRunner = {
    run(command, args, stdin) {
      calls.push({ command, args, stdin });
      return result instanceof Error ? Promise.reject(result) : Promise.resolve(result);
    },
  };
  return { runner, calls };
}

const OK: ProcessResult = { exitCode: 0, stdout: '', stderr: '' };
const NOTIFICATION = { title: 'Done $HOME', message: '"quoted"', project: 'app' };

suite('createNotifier（Windows）', () => {
  test('powershell.exe をプロファイル無し、対話無しで起動し、スクリプトを -EncodedCommand で渡す', async () => {
    const { runner, calls } = fakeRunner(OK);
    await createNotifier('win32', runner, 'Microsoft.VisualStudioCode').notify(NOTIFICATION);
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].command, 'powershell.exe');
    assert.deepStrictEqual(calls[0].args, [
      '-NoProfile',
      '-NonInteractive',
      '-EncodedCommand',
      encodePowerShellCommand(TOAST_SCRIPT),
    ]);
  });

  test('通知の内容は引数に入れず、標準入力の JSON で渡す', async () => {
    const { runner, calls } = fakeRunner(OK);
    await createNotifier('win32', runner, 'Microsoft.VisualStudioCode').notify(NOTIFICATION);
    assert.ok(!calls[0].args.some((arg) => arg.includes('Done')), '引数に通知の内容が入っている');
    const input = JSON.parse(calls[0].stdin) as Record<string, string>;
    assert.strictEqual(input.appId, 'Microsoft.VisualStudioCode');
    assert.strictEqual(input.title, 'Done $HOME');
    assert.strictEqual(input.body, '"quoted"');
    assert.strictEqual(input.attribution, 'app');
  });

  test('終了コードが 0 なら成功', async () => {
    const { runner } = fakeRunner(OK);
    const result = await createNotifier('win32', runner, 'x').notify(NOTIFICATION);
    assert.deepStrictEqual(result, { ok: true });
  });

  test('終了コードが 0 以外なら失敗。標準エラーの内容を添える', async () => {
    const { runner } = fakeRunner({ exitCode: 1, stdout: '', stderr: '  boom\r\n' });
    const result = await createNotifier('win32', runner, 'x').notify(NOTIFICATION);
    assert.deepStrictEqual(result, { ok: false, reason: 'failed', detail: 'boom' });
  });

  test('標準エラーが空なら、終了コードを添える', async () => {
    const { runner } = fakeRunner({ exitCode: 3, stdout: '', stderr: '' });
    const result = await createNotifier('win32', runner, 'x').notify(NOTIFICATION);
    assert.deepStrictEqual(result, { ok: false, reason: 'failed', detail: 'exit code 3' });
  });

  test('起動に失敗しても例外にせず、失敗として返す', async () => {
    const { runner } = fakeRunner(new Error('spawn powershell.exe ENOENT'));
    const result = await createNotifier('win32', runner, 'x').notify(NOTIFICATION);
    assert.deepStrictEqual(result, {
      ok: false,
      reason: 'failed',
      detail: 'spawn powershell.exe ENOENT',
    });
  });
});

suite('createNotifier（Windows 以外）', () => {
  for (const platform of ['linux', 'darwin']) {
    test(platform + ' では対応していないと返し、プロセスを起動しない', async () => {
      const { runner, calls } = fakeRunner(OK);
      const result = await createNotifier(platform, runner, 'x').notify(NOTIFICATION);
      assert.deepStrictEqual(result, { ok: false, reason: 'unsupported' });
      assert.strictEqual(calls.length, 0);
    });
  }
});
