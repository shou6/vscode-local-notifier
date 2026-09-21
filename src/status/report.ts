import { InboxLocation } from '../inbox/location';
import { Translate } from '../message/testNotification';
import { NotifyResult } from '../notify/notifier';

/** 状態の一覧を作るのに要るもの */
export interface StatusInput {
  /** process.platform */
  platform: string;
  /** vscode.env.remoteName */
  remoteName: string | undefined;
  /** 設定 localNotifier.enabled */
  enabled: boolean;
  /** 見張っている受信箱 */
  inboxes: { kind: InboxLocation['kind']; path: string; poll: boolean; project?: string }[];
  /** このウィンドウで最後に出した通知の結果。まだ出していなければ undefined */
  lastToast: NotifyResult | undefined;
}

/** 一覧の 1 行 */
export interface StatusRow {
  label: string;
  description?: string;
  detail?: string;
  /** 利用者が直す必要のある問題か */
  problem: boolean;
}

/**
 * 状態の一覧。上から、通知を出せるか、最後の通知の結果、接続先、見張っている受信箱の順。
 */
export function statusRows(t: Translate, input: StatusInput): StatusRow[] {
  const rows: StatusRow[] = [
    availability(t, input),
    lastToast(t, input.lastToast),
    windowRow(t, input.remoteName),
  ];
  if (!input.enabled) {
    return rows;
  }
  if (input.inboxes.length === 0) {
    rows.push({ label: t('No inbox is being watched'), problem: true });
    return rows;
  }
  for (const inbox of input.inboxes) {
    rows.push({
      label: inboxLabel(t, inbox.kind, inbox.project ?? ''),
      description: inbox.poll ? t('watched, and checked every 2 seconds') : t('watched'),
      detail: inbox.path,
      problem: false,
    });
  }
  return rows;
}

function availability(t: Translate, input: StatusInput): StatusRow {
  if (input.platform !== 'win32') {
    return { label: t('Desktop notifications: only supported on Windows'), problem: true };
  }
  if (!input.enabled) {
    return {
      label: t('Desktop notifications: disabled by "localNotifier.enabled"'),
      problem: true,
    };
  }
  return { label: t('Desktop notifications: available'), problem: false };
}

function lastToast(t: Translate, result: NotifyResult | undefined): StatusRow {
  if (result === undefined) {
    return { label: t('Last notification: none in this window yet'), problem: false };
  }
  if (result.ok) {
    return { label: t('Last notification: shown'), problem: false };
  }
  const detail = result.reason === 'failed' ? result.detail : result.reason;
  return { label: t('Last notification: failed ({0})', detail), problem: true };
}

function windowRow(t: Translate, remoteName: string | undefined): StatusRow {
  switch (remoteName) {
    case undefined:
      return { label: t('Window: local'), problem: false };
    case 'wsl':
      return { label: t('Window: WSL'), problem: false };
    case 'dev-container':
      return { label: t('Window: Dev Container'), problem: false };
    default:
      return { label: t('Window: {0} (not supported)', remoteName), problem: true };
  }
}

function inboxLabel(t: Translate, kind: InboxLocation['kind'], project: string): string {
  switch (kind) {
    case 'globalStorage':
      return t('Inbox for all workspaces');
    case 'path':
      return t('Inbox from "localNotifier.inboxPath"');
    case 'workspaceStorage':
      return t('Inbox for this workspace ({0})', project);
    case 'workspace':
      return t('Inbox for this Dev Container ({0})', project);
  }
}
