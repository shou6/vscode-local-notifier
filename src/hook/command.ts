import { Notification } from '../message/types';

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
  _remoteName: string | undefined,
  _localInboxPath: string,
  _devcontainerInboxPath: string | undefined
): HookTarget | undefined {
  throw new Error('not implemented');
}

export function availableShells(_target: HookTarget): Shell[] {
  throw new Error('not implemented');
}

/** bash の単一引用符で囲む */
export function shQuote(_value: string): string {
  throw new Error('not implemented');
}

/** PowerShell の単一引用符で囲む */
export function psQuote(_value: string): string {
  throw new Error('not implemented');
}

/** 受信箱へ通知を 1 件書くコマンド。書きかけを読まれないよう、一時ファイルに書いてから名前を変える */
export function hookCommand(
  _target: HookTarget,
  _shell: Shell,
  _notification: Notification
): string {
  throw new Error('not implemented');
}
