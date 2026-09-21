export type Shell = 'bash' | 'powershell';

/** hook が通知を書く先。inboxPath は hook が動く環境から見たパスではなく、拡張が知っているパス */
export type HookTarget =
  /** Windows のローカル。inboxPath は Windows のパス */
  | { kind: 'local'; inboxPath: string }
  /** WSL。inboxPath は Windows のパスで、hook の中で wslpath で変換する */
  | { kind: 'wsl'; inboxPath: string }
  /** Dev Container。inboxPath はコンテナの中のパス */
  | { kind: 'devcontainer'; inboxPath: string };

/** 今の環境で hook が通知を書く先。対応していない環境なら undefined */
export function hookTarget(
  remoteName: string | undefined,
  localInboxPath: string,
  devcontainerInboxPath: string | undefined
): HookTarget | undefined {
  switch (remoteName) {
    case undefined:
      return { kind: 'local', inboxPath: localInboxPath };
    case 'wsl':
      return { kind: 'wsl', inboxPath: localInboxPath };
    case 'dev-container':
      return devcontainerInboxPath === undefined
        ? undefined
        : { kind: 'devcontainer', inboxPath: devcontainerInboxPath };
    default:
      return undefined;
  }
}

/** hook の届け先。このワークスペースのウィンドウだけか、すべてのウィンドウか */
export type HookScope = 'workspace' | 'all';

/** 今の環境で選べる届け先。先頭が既定 */
export function availableScopes(
  remoteName: string | undefined,
  workspaceStorage: boolean
): HookScope[] {
  switch (remoteName) {
    case undefined:
    case 'wsl':
      return workspaceStorage ? ['workspace', 'all'] : ['all'];
    case 'dev-container':
      // コンテナの中から Windows 側の受信箱には書けない
      return ['workspace'];
    default:
      return [];
  }
}

/** Dev Container と WSL の中は Linux なので bash だけにする */
export function availableShells(target: HookTarget): Shell[] {
  return target.kind === 'local' ? ['bash', 'powershell'] : ['bash'];
}

/** bash の単一引用符で囲む */
export function shQuote(value: string): string {
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

/** PowerShell の単一引用符で囲む */
export function psQuote(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'";
}

/**
 * 受信箱へ通知を 1 件書くコマンド。書きかけを読まれないよう、一時ファイルに書いてから名前を変える。
 * payload は受信箱へ書く JSON（定義の名前だけ、または文面を直接書いたもの）。
 */
export function hookCommand(target: HookTarget, shell: Shell, payload: object): string {
  const json = JSON.stringify(payload);
  if (shell === 'powershell') {
    return [
      '$d = ' + psQuote(target.inboxPath),
      "$n = '' + [DateTimeOffset]::Now.ToUnixTimeMilliseconds() + '-' + $PID",
      // WriteAllText は BOM 無しの UTF-8 で書く
      '[IO.File]::WriteAllText("$d\\.tmp-$n.json", ' + psQuote(json) + ')',
      'Move-Item "$d\\.tmp-$n.json" "$d\\$n.json"',
    ].join('; ');
  }
  return [
    'd=' + bashInboxPath(target),
    'n="$(date +%s%N)-$$"',
    "printf '%s' " + shQuote(json) + ' > "$d/.tmp-$n.json" && mv "$d/.tmp-$n.json" "$d/$n.json"',
  ].join('; ');
}

function bashInboxPath(target: HookTarget): string {
  switch (target.kind) {
    case 'devcontainer':
      return shQuote(target.inboxPath);
    case 'wsl':
      // 自動マウントの場所（既定は /mnt/c）を変えている環境でも正しく変換される
      return '"$(wslpath ' + shQuote(target.inboxPath) + ')"';
    case 'local':
      // Git Bash は / 区切りの Windows のパスをそのまま扱える
      return shQuote(target.inboxPath.replace(/\\/g, '/'));
  }
}
