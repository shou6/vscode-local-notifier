import * as assert from 'assert';
import {
  availableShells,
  hookCommand,
  hookTarget,
  HookTarget,
  psQuote,
  shQuote,
} from '../../hook/command';

const NOTIFICATION = { title: 'Done', message: 'Finished', level: 'success' as const };
const WINDOWS_INBOX =
  'C:\\Users\\me\\AppData\\Roaming\\Code\\User\\globalStorage\\shou6.vscode-local-notifier\\inbox';

suite('hookTarget', () => {
  test('ローカルでは、拡張機能専用の保存フォルダの受信箱へ書く', () => {
    assert.deepStrictEqual(hookTarget(undefined, WINDOWS_INBOX, undefined), {
      kind: 'local',
      inboxPath: WINDOWS_INBOX,
    });
  });

  test('WSL でも、Windows 側の保存フォルダの受信箱へ書く', () => {
    assert.deepStrictEqual(hookTarget('wsl', WINDOWS_INBOX, undefined), {
      kind: 'wsl',
      inboxPath: WINDOWS_INBOX,
    });
  });

  test('Dev Container では、.devcontainer の下の受信箱へ書く', () => {
    const inbox = '/workspace/.devcontainer/.local-notifier/inbox';
    assert.deepStrictEqual(hookTarget('dev-container', WINDOWS_INBOX, inbox), {
      kind: 'devcontainer',
      inboxPath: inbox,
    });
  });

  test('Dev Container でも .devcontainer の受信箱が無ければ、対応していない', () => {
    assert.strictEqual(hookTarget('dev-container', WINDOWS_INBOX, undefined), undefined);
  });

  test('SSH など、ほかのリモートには対応していない', () => {
    assert.strictEqual(hookTarget('ssh-remote', WINDOWS_INBOX, undefined), undefined);
  });
});

suite('availableShells', () => {
  test('ローカルでは bash（Git Bash）と PowerShell を選べる', () => {
    assert.deepStrictEqual(availableShells({ kind: 'local', inboxPath: WINDOWS_INBOX }), [
      'bash',
      'powershell',
    ]);
  });

  test('Dev Container と WSL は bash だけ', () => {
    assert.deepStrictEqual(availableShells({ kind: 'devcontainer', inboxPath: '/w' }), ['bash']);
    assert.deepStrictEqual(availableShells({ kind: 'wsl', inboxPath: WINDOWS_INBOX }), ['bash']);
  });
});

suite('shQuote', () => {
  test('単一引用符で囲む', () => {
    assert.strictEqual(shQuote('a b $HOME'), "'a b $HOME'");
  });

  test('中の単一引用符は、いったん閉じてエスケープする', () => {
    assert.strictEqual(shQuote("it's"), "'it'\\''s'");
  });
});

suite('psQuote', () => {
  test('単一引用符で囲み、中の単一引用符は 2 つ重ねる', () => {
    assert.strictEqual(psQuote("it's $x"), "'it''s $x'");
  });
});

suite('hookCommand（bash）', () => {
  test('Dev Container では、コンテナの中のパスへ一時ファイルを書いてから名前を変える', () => {
    const target: HookTarget = {
      kind: 'devcontainer',
      inboxPath: '/workspace/.devcontainer/.local-notifier/inbox',
    };
    assert.strictEqual(
      hookCommand(target, 'bash', NOTIFICATION),
      "d='/workspace/.devcontainer/.local-notifier/inbox'; " +
        'n="$(date +%s%N)-$$"; ' +
        'printf \'%s\' \'{"title":"Done","message":"Finished","level":"success"}\' > "$d/.tmp-$n.json" && ' +
        'mv "$d/.tmp-$n.json" "$d/$n.json"'
    );
  });

  test('WSL では、Windows のパスを wslpath で変換する', () => {
    const command = hookCommand({ kind: 'wsl', inboxPath: WINDOWS_INBOX }, 'bash', NOTIFICATION);
    assert.ok(command.startsWith('d="$(wslpath \'' + WINDOWS_INBOX + '\')"; '), command);
  });

  test('ローカルの Git Bash では、Windows のパスの区切りを / にする', () => {
    const command = hookCommand({ kind: 'local', inboxPath: WINDOWS_INBOX }, 'bash', NOTIFICATION);
    assert.ok(command.startsWith("d='" + WINDOWS_INBOX.replace(/\\/g, '/') + "'; "), command);
  });

  test('通知の文面に単一引用符があっても、壊れずに引用される', () => {
    const command = hookCommand({ kind: 'devcontainer', inboxPath: '/w' }, 'bash', {
      title: "It's done",
      message: 'M',
    });
    assert.ok(command.includes('\'{"title":"It\'\\\'\'s done","message":"M"}\''), command);
  });
});

suite('hookCommand（PowerShell）', () => {
  test('一時ファイルへ BOM 無しの UTF-8 で書いてから名前を変える', () => {
    assert.strictEqual(
      hookCommand({ kind: 'local', inboxPath: WINDOWS_INBOX }, 'powershell', NOTIFICATION),
      "$d = '" +
        WINDOWS_INBOX +
        "'; " +
        "$n = '' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + '-' + $PID; " +
        '[IO.File]::WriteAllText("$d\\.tmp-$n.json", \'{"title":"Done","message":"Finished","level":"success"}\'); ' +
        'Move-Item "$d\\.tmp-$n.json" "$d\\$n.json"'
    );
  });

  test('通知の文面の単一引用符は 2 つ重ねる', () => {
    const command = hookCommand({ kind: 'local', inboxPath: 'C:\\x' }, 'powershell', {
      title: "It's done",
      message: 'M',
    });
    assert.ok(command.includes('\'{"title":"It\'\'s done","message":"M"}\''), command);
  });
});
