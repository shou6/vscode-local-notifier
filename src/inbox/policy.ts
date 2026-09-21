/** これより古いファイルは、VS Code を閉じていた間に溜まったものとして通知しない */
export const MAX_AGE_MS = 5 * 60 * 1000;

/**
 * 通知の候補になるファイル名か。
 * . で始まるものは除く。送り手が書きかけの一時ファイルと、取り合いで確保した後のファイルがこれに当たる。
 */
export function isCandidate(name: string): boolean {
  return !name.startsWith('.') && name.toLowerCase().endsWith('.json');
}

/**
 * 取り合いで確保した後の名前。
 * 複数のウィンドウが同じ受信箱を見張っていても、rename に成功した 1 つだけが通知する。
 */
export function claimedName(name: string, windowId: string): string {
  return '.claimed-' + windowId + '-' + name;
}

export function isStale(mtimeMs: number, nowMs: number): boolean {
  return nowMs - mtimeMs > MAX_AGE_MS;
}
