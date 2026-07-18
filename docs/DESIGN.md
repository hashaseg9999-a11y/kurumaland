# KurumaLand 設計ドキュメント

対象読者: 実装担当AI(Codex / AntiGravity)およびレビュー担当(Claude)。
本ドキュメントは全イシューの**共通契約**です。ここに定義されたインターフェース・命名規約から逸脱する場合は、PR本文に理由を明記してください。

## 1. 目的とコンセプト

1歳8ヶ月の幼児(車が大好き)がiPadで遊ぶ知育アプリ。育てる力は次の2軸:

1. **色・形・大小の認知**
2. **手先の操作(微細運動)**

車テーマのミニアクティビティ6種を絵柄メニューから回遊し、合計1時間程度遊べる構成。
音声は**日本語・英語・タイ語**の3言語対応。

## 2. 設計原則(非ドーパミン設計)— 全イシュー共通の必須要件

1. **失敗状態なし・時間制限なし・スコア/連続記録/バッジなし**
2. ご褒美は「静かな達成感」: 車がにっこり、柔らかいチャイム1回、小さな拍手。派手な爆発演出・連打誘導・ルーレット的演出は禁止
3. 文字に依存しないUI(メニューは絵柄のみ)。**タッチターゲットは最小80×80pt**、ドラッグのスナップ判定は寛容に(目標領域の1.5倍程度)
4. **広告ゼロ・外部リンクゼロ・実行時ネットワーク通信ゼロ・計測/分析ゼロ**
5. 保護者向けUI(設定・終了)は「3秒長押しのペアレンタルゲート」の奥に隔離。幼児が偶然開けない
6. 「おしまいモード」(任意設定): 親が設定した時間(10/20/30分)経過で、車たちが車庫に帰る演出→「おしまい」画面で穏やかに終了を促す。強制ロックはしない

## 3. 技術構成

- **Vite + TypeScript(strict)、フレームワークなし(Vanilla TS + DOM)**
- PWA: `vite-plugin-pwa`(precacheで完全オフライン動作)
- 配信: GitHub Pages(サブパス配信のため `base` 設定必須)
- 対象: iPad Safari(横向き前提)。Pointer Events を使用
- 依存パッケージは最小限に。UIフレームワーク・状態管理ライブラリは追加しない

### ディレクトリ構造

```
KurumaLand/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/                # PWAアイコン等
├── docs/
│   └── DESIGN.md          # 本ドキュメント
└── src/
    ├── main.ts            # 起動・オーディオアンロック・メニュー表示
    ├── core/
    │   ├── activity.ts    # Activity インターフェース定義(§4)
    │   ├── router.ts      # メニュー⇔アクティビティ遷移
    │   ├── speech.ts      # 3言語TTS(§5)
    │   ├── vocab.ts       # 3言語語彙辞書(§5)
    │   ├── sfx.ts         # 効果音(§6)
    │   ├── settings.ts    # 設定の保存/読込(localStorage)
    │   └── gate.ts        # ペアレンタルゲート(3秒長押し)
    ├── activities/
    │   ├── signal.ts      # A1 しんごうでGO
    │   ├── colorGarage.ts # A2 いろのしゃこ
    │   ├── bigSmall.ts    # A3 おおきい・ちいさい
    │   ├── trace.ts       # A4 みちをなぞろう
    │   ├── carWash.ts     # A5 くるまあらい
    │   └── puzzle.ts      # A6 くるまパズル
    ├── assets/            # NANOBANANA生成画像(§7)
    └── styles/
```

## 4. Activity インターフェース(共通契約)

各アクティビティは以下を実装し、`src/activities/index.ts` の配列に登録するだけでメニューに並ぶこと。

```ts
// src/core/activity.ts
export interface ActivityContext {
  root: HTMLElement;        // 全画面の描画先。mount時は空
  speech: SpeechService;    // §5
  sfx: SfxService;          // §6
  settings: Settings;       // 言語モード等(読み取り)
  exitToMenu(): void;       // メニューへ戻る(戻るボタン用)
  notifyTaskComplete(): void; // 課題完了をおしまいタイマーへ通知
}

export interface Activity {
  readonly id: string;        // 例 "color-garage"(ケバブケース)
  readonly menuIcon: string;  // メニュー表示用画像パス(assets内)
  mount(ctx: ActivityContext): void;  // DOM構築+開始
  unmount(): void;  // DOM・イベントリスナー・タイマー・アニメを全て解放
}
```

- 各アクティビティは**独立ファイル・独立イシュー**で実装する。他のアクティビティのファイルを変更しない
- 左上に共通の「おうちに戻る」ボタン(router側で提供)。アクティビティ内には終了UIを作らない
- 課題を1つ完了するごとに: `sfx.play('chime')` + 対象の語彙を `speech.speak()`。全課題完了で小さな拍手→**同じ遊びが新しい配置で再開**(無限に遊べるが、演出はエスカレートさせない)

## 5. 3言語音声(speech.ts / vocab.ts)

```ts
// src/core/speech.ts
export type Lang = 'ja' | 'en' | 'th';
export type LangMode = Lang | 'rotate';  // rotate = タップごとに ja→en→th と巡回

export interface SpeechService {
  speak(key: VocabKey): void;   // 現在のLangModeに従い発話。発話中の再タップは割り込み(cancel→speak)
  unlock(): void;               // 初回ユーザータッチで呼ぶ(iOS対策)
}
```

- 実装は Web Speech API(`speechSynthesis`)。言語ごとに `SpeechSynthesisUtterance.lang` を `ja-JP` / `en-US` / `th-TH` に設定し、`getVoices()` から一致ボイスを選択
- **タイ語ボイスが端末にない場合**: 無音でスキップし、視覚フィードバック(対象がバウンス)のみ。エラー表示はしない
- rate は 0.9(幼児向けにやや遅く)
- 語彙は `vocab.ts` にキーで一元管理。例:

```ts
// src/core/vocab.ts
export const VOCAB = {
  car:      { ja: 'くるま',       en: 'car',        th: 'รถยนต์' },
  red:      { ja: 'あか',         en: 'red',        th: 'สีแดง' },
  blue:     { ja: 'あお',         en: 'blue',       th: 'สีน้ำเงิน' },
  yellow:   { ja: 'きいろ',       en: 'yellow',     th: 'สีเหลือง' },
  green:    { ja: 'みどり',       en: 'green',      th: 'สีเขียว' },
  big:      { ja: 'おおきい',     en: 'big',        th: 'ใหญ่' },
  small:    { ja: 'ちいさい',     en: 'small',      th: 'เล็ก' },
  circle:   { ja: 'まる',         en: 'circle',     th: 'วงกลม' },
  wellDone: { ja: 'よくできました', en: 'well done',  th: 'เก่งมาก' },
  // 各アクティビティのイシューで必要語彙を追加(色+名詞の複合キー redCar 等も可)
} as const;
export type VocabKey = keyof typeof VOCAB;
```

- タイ語表記はネイティブ確認前の暫定。**PRでタイ語を追加・変更した場合はPR本文に一覧を記載**(hasさんが確認する)

## 6. 効果音(sfx.ts)

```ts
export type SfxName = 'chime' | 'pop' | 'horn' | 'engine' | 'water' | 'applause';
export interface SfxService {
  play(name: SfxName): void;
  unlock(): void;  // 初回タッチでAudioContext.resume()
}
```

- Web Audio API による**合成音**を基本とする(音声ファイル不要、容量ゼロ)。音量は控えめ・柔らかい音色に
- 合成で品質が不足する音のみ短いファイル(合計500KB以内)を許可

## 7. ビジュアル素材(NANOBANANA生成、担当: AntiGravity)

### スタイルガイドプロンプト(全素材共通の基調)

```
Cute flat cartoon illustration for a toddler app, simple rounded shapes,
thick soft outlines, bright cheerful colors, friendly face with big eyes
and a gentle smile (for vehicles), side view, centered,
plain solid white background (to be removed), no text, no watermark
```

- 全素材を同一セッション・同一スタイル参照で生成し、絵柄のタッチを統一する
- 背景は生成後に透過処理(白背景で生成→透過WebPに変換)

### 素材リストと命名規約(配置先: `src/assets/`)

| ファイル名 | 内容 | 備考 |
|---|---|---|
| `car_{color}.webp` | 乗用車(横向き・笑顔) | color = red / blue / yellow / green |
| `car_{color}_big.webp` | 大きい働く車(バス・トラック等) | A3用。redはトラック、blueはバス等、車種で差別化可 |
| `garage_{color}.webp` | 車庫(正面・入口が見える) | 4色。車と同じ色相に揃える |
| `parking_big.webp` / `parking_small.webp` | 駐車枠(俯瞰) | A3用 |
| `signal.webp` | 信号機(消灯状態) | 点灯はCSSオーバーレイで表現 |
| `wash_sponge.webp` / `wash_foam.webp` / `wash_towel.webp` | スポンジ・泡・タオル | A5用 |
| `car_dirty.webp` | 泥はね付きの車 | A5用(汚れは別レイヤーでも可) |
| `bg_road.webp` | 道路と空の背景(横長) | 共通背景。1280×960目安 |
| `menu_{activityId}.webp` | メニューアイコン(6種) | 例 `menu_color-garage.webp` |
| `app_icon.png` | PWAアイコン(512×512、背景あり) | public/ に配置 |

- 形式: WebP(アイコンのみPNG)。1枚200KB以下、**合計3MB以内**
- 車のスプライトは進行方向=右向きで統一
- パズル(A6)は `car_red.webp` をコード側で分割描画(canvas)するため専用素材不要

## 8. iPad Safari 固有要件(足場イシューで実装、全員が維持)

1. **オーディオアンロック**: 初回 `pointerdown` で `sfx.unlock()` + `speech.unlock()`(無音utteranceの発話)
2. **ズーム・選択の無効化**: viewport `user-scalable=no`、CSS `touch-action: none`(ゲーム領域)、`user-select: none`、`-webkit-touch-callout: none`、`gesturestart` の preventDefault
3. **横向き前提**: 縦向き時は「よこにしてね」の絵柄オーバーレイを表示
4. マウスでも動作すること(開発・レビュー用)。Pointer Events で統一実装
5. READMEに **ガイドアクセス(Guided Access)** の設定手順を記載(ホームバー誤操作対策)

## 9. 開発フローとイシュー順序

- 1イシュー=1PR。**対象範囲は `KurumaLand/` 配下のみ**。他アプリ・リポジトリ設定に触れない
- 順序: 足場(#1)と素材(#2)は並行 → 音声(#3) → アクティビティA1〜A6(並行可) → PWA仕上げ
- 各PRで `npm run build` と `npm run typecheck` を通すこと
- PR本文: What / Why / Impact / Verification + 判断に迷った点

## 10. アクティビティ仕様サマリー

詳細は各イシューに記載。共通: 完了時チャイム+語彙発話、失敗演出なし、無限再開。

| ID | 名前 | 育てる力 | 概要 |
|---|---|---|---|
| `signal` | しんごうでGO | 因果関係・色 | 信号タップ→青で車が走る。車タップでクラクション+「くるま」発話 |
| `color-garage` | いろのしゃこ | 色の認知 | 色つきの車を同色の車庫へドラッグ。到着時に色を発話 |
| `big-small` | おおきい・ちいさい | 大小の認知 | 大小の車を合うサイズの駐車枠へ。「おおきい/ちいさい」発話 |
| `trace` | みちをなぞろう | 微細運動 | 太い道(直線→曲線→ジグザグ)を指でなぞると車が追従 |
| `car-wash` | くるまあらい | 順序・スワイプ | スポンジで泡→水で流す→タオルで拭く、の3ステップ洗車 |
| `puzzle` | くるまパズル | 形の認知 | 車の絵を2〜4分割し、枠へドラッグして完成させる |
