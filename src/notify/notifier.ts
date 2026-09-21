import { Notification } from '../message/types';
import { ProcessRunner } from '../platform/process';
import { formatToast } from './format';
import { encodePowerShellCommand, TOAST_SCRIPT, toastInput } from './script';

export type NotifyResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' }
  | { ok: false; reason: 'failed'; detail: string };

/** デスクトップ通知を出す。OS ごとに実装を差し替える */
export interface Notifier {
  notify(notification: Notification): Promise<NotifyResult>;
}

export function createNotifier(platform: string, runner: ProcessRunner, appId: string): Notifier {
  return platform === 'win32' ? windowsToastNotifier(runner, appId) : unsupportedNotifier;
}

const unsupportedNotifier: Notifier = {
  notify: () => Promise.resolve({ ok: false, reason: 'unsupported' }),
};

/** PowerShell から WinRT のトーストを出す。VSIX にネイティブ物を入れずに済む */
function windowsToastNotifier(runner: ProcessRunner, appId: string): Notifier {
  const args = [
    '-NoProfile',
    '-NonInteractive',
    '-EncodedCommand',
    encodePowerShellCommand(TOAST_SCRIPT),
  ];
  return {
    async notify(notification) {
      const input = toastInput(formatToast(notification), appId);
      try {
        const result = await runner.run('powershell.exe', args, input);
        if (result.exitCode === 0) {
          return { ok: true };
        }
        const detail = result.stderr.trim() || 'exit code ' + String(result.exitCode);
        return { ok: false, reason: 'failed', detail };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        return { ok: false, reason: 'failed', detail };
      }
    },
  };
}
