/** これより古いファイルは、VS Code を閉じていた間に溜まったものとして通知しない */
export const MAX_AGE_MS = 0;

/** 通知の候補になるファイル名か */
export function isCandidate(_name: string): boolean {
  throw new Error('not implemented');
}

/** 取り合いで確保した後の名前 */
export function claimedName(_name: string, _windowId: string): string {
  throw new Error('not implemented');
}

export function isStale(_mtimeMs: number, _nowMs: number): boolean {
  throw new Error('not implemented');
}
