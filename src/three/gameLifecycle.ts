type Disposable = { dispose(): void };

/**
 * 3Dゲーム共通のunmount前半処理。
 * 登録済みcleanupを実行して配列を空にし、HUD・パーティクル・カメラパルス等を順に解放する。
 * ゲーム固有のgeometry/material/timerは各ゲーム側で解放する。
 */
export function releaseGameBase(
  cleanup: Array<() => void>,
  ...resources: Array<Disposable | null | undefined>
): void {
  for (const off of cleanup) off();
  cleanup.length = 0;
  for (const resource of resources) resource?.dispose();
}
