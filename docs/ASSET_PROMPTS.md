# KurumaLand ビジュアル素材生成仕様＆スタイルプロンプト一覧 (ASSET_PROMPTS.md)

本ドキュメントは、幼児向け知育PWA「KurumaLand」で利用するビジュアル素材群（NANOBANANA生成素材）のスタイル仕様・プロンプト・配色ルール・再生成手順を記録する公式ドキュメントです。
対応Issue: **#133** (ビジュアル素材一式のNANOBANANA生成)

---

## 1. スタイルガイド基調 (基底プロンプト＆デザイン規約)

全素材共通で適用される基底プロンプトおよびデザイン指針（`DESIGN.md` §2および§7準拠）：

```text
Cute flat cartoon illustration for a toddler app, simple rounded shapes,
thick soft outlines, bright cheerful colors, friendly face with big eyes
and a gentle smile (for vehicles), side view, centered,
plain solid white background (to be removed), no text, no watermark
```

### 認知・安全上の設計要件（1歳8ヶ月の幼児向け）
1. **主線（アウトライン）**: 太いソフトアウトライン（8〜12pt・角丸ラウンド処理、色彩は暖かみのあるウォームブラウン `#4A3B32` で統一）により視認性とコントラストを高める。
2. **形態と表情**: 車両は一目で認知可能な**右向き側面図（進行方向）**で統一し、窓の前方に大きめの明るい瞳とにっこり優しい笑顔を配置（過激・刺激的な表現や怖い表情を排除）。
3. **文字・ロゴ除去**: 幼児による誤認識や商標・著作権トラブルを防ぐため、実在メーカーロゴ、車名の文字、エンブレムは一切含めない。
4. **背景透過と軽量化**: iOS/iPad Safari Retina での鮮明さを保ちつつ、切り抜き素材はアルファチャネル透過WebP、道路背景は完全不透明WebP、アプリロゴは背景あり完全不透明512×512 PNGを採用。全27画像は合計138,941 bytes（約136 KiB）に収まり、瞬時の読み込みを実現。

---

## 2. 配色トークン・カラーパレット

アプリ全体の色・形の認知の一貫性を保つため、車両・車庫・メニューアイコンで以下の同一色相を採用しています。

| カラー | カラーコード (Hex) | 用途・対応関係 |
|---|---|---|
| **Red (あか)** | `#FF5252` | `car_red.webp`, `car_red_big.webp` (消防車風トラック), `garage_red.webp` |
| **Blue (あお)** | `#448AFF` | `car_blue.webp`, `car_blue_big.webp` (2階建てバス), `garage_blue.webp` |
| **Yellow (きいろ)** | `#FFD740` | `car_yellow.webp`, `car_yellow_big.webp` (大型ダンプ・バン), `garage_yellow.webp` |
| **Green (みどり)** | `#69F0AE` | `car_green.webp`, `car_green_big.webp` (ロングカーゴトラック), `garage_green.webp` |
| **Outline (主線)** | `#4A3B32` | 全アイテム共通ソフトアウトライン |
| **Window (窓色)** | `#E1F5FE` | 車両のキャビン窓・グラス部分 |

---

## 3. 素材別プロンプト＆生成仕様表

全アイテムの出力設定・構成一覧です。

> [!NOTE]
> **プロンプト履歴管理に関する記録（捏造防止・監査対応）**:
> 初期セッションで生成された下記表中の19画像については、生成当時の実プロンプト本文履歴がログに保存されておらず、捏造したプロンプトの記載を行わない方針に基づき、構成要素概要のみを記載しています。
> 一方、PR #142（Issue #133対応）において同一スタイル参照で再生成・修正を実施した対象8画像（`car_dirty.webp`, `signal.webp`, メニューアイコン6種）については、実際に使用した全文プロンプトを **「第5節. SOLUltra 再生成セッションで使用した全文プロンプト一覧」** に原文のまま完全記録しています。

| 素材ファイル名 | 種類 | 解像度基準 | 透過 | プロンプト・構成要素概要 |
|---|---|---|---|---|
| `car_red.webp` | 乗用車 | 400×300 | あり | かわいい赤い乗用車、右向き、丸い窓と黒タイヤ、笑顔 |
| `car_blue.webp` | 乗用車 | 400×300 | あり | かわいい青い乗用車、右向き、丸い窓と黒タイヤ、笑顔 |
| `car_yellow.webp` | 乗用車 | 400×300 | あり | かわいい黄色い乗用車、右向き、丸い窓と黒タイヤ、笑顔 |
| `car_green.webp` | 乗用車 | 400×300 | あり | かわいい緑の乗用車、右向き、丸い窓と黒タイヤ、笑顔 |
| `car_red_big.webp` | 大きい車 | 450×320 | あり | 大きい赤い消防車風トラック、後部コンテナ、右向き笑顔 |
| `car_blue_big.webp` | 大きい車 | 450×320 | あり | 大きい青い2階建て・大型乗合バス、右向き笑顔 |
| `car_yellow_big.webp` | 大きい車 | 450×320 | あり | 大きい黄色い大型ダンプ/バン車、右向き笑顔 |
| `car_green_big.webp` | 大きい車 | 450×320 | あり | 大きい緑のロングカーゴトラック、右向き笑顔 |
| `garage_red.webp` | 車庫 | 350×300 | あり | 赤いアーチ屋根の車庫正面図、車と同色で対応 |
| `garage_blue.webp` | 車庫 | 350×300 | あり | 青いアーチ屋根の車庫正面図、車と同色で対応 |
| `garage_yellow.webp` | 車庫 | 350×300 | あり | 黄色いアーチ屋根の車庫正面図、車と同色で対応 |
| `garage_green.webp` | 車庫 | 350×300 | あり | 緑のアーチ屋根の車庫正面図、車と同色で対応 |
| `parking_big.webp` | 駐車枠 | 420×260 | あり | 俯瞰の大きい駐車枠、白線と車止めバー |
| `parking_small.webp` | 駐車枠 | 320×220 | あり | 俯瞰の小さい駐車枠、白線と車止めバー |
| `signal.webp` | 信号機 | 200×380 | あり | 3つの中立グレー消灯レンズを持つ信号機（点灯はアクティビティ側CSSで重ね合わせ） |
| `wash_sponge.webp` | 洗車道具 | 300×300 | あり | 柔らかい黄＆ピンクの洗車スポンジ |
| `wash_foam.webp` | 洗車道具 | 300×300 | あり | モコモコの白いシャボン泡 |
| `wash_towel.webp` | 洗車道具 | 300×300 | あり | ふわふわの水色タオル |
| `car_dirty.webp` | 泥はね車 | 400×300 | あり | `car_red.webp`と同じ右向き・笑顔・車輪・車体配置に、泥はねと泥汚れを加えた状態 |
| `bg_road.webp` | 背景 | 1280×960 | なし（完全不透明） | 青空、白い雲、緑の丘、中央破線の広い道路 |
| `menu_signal.webp` | メニュー | 300×300 | あり | 右向きの笑顔の赤い車と信号機を描いた絵柄アイコン（文字なし） |
| `menu_color-garage.webp` | メニュー | 300×300 | あり | 赤い笑顔の車と同色の車庫を描いた絵柄アイコン（文字なし） |
| `menu_big-small.webp` | メニュー | 300×300 | あり | 大きい青いバスと小さい黄色い車、駐車枠を描いた絵柄アイコン（文字なし） |
| `menu_trace.webp` | メニュー | 300×300 | あり | 太く見やすい曲線の道を走る笑顔の緑の車を描いた絵柄アイコン（文字なし） |
| `menu_car-wash.webp` | メニュー | 300×300 | あり | 泥の付いた赤い車、スポンジ、泡を描いた絵柄アイコン（文字なし） |
| `menu_puzzle.webp` | メニュー | 300×300 | あり | 3つのパズル片に分かれた笑顔の車を描いた絵柄アイコン（文字なし） |
| `app_icon.png` | ロゴ | 512×512 | なし（完全不透明） | 青空・芝生背景に笑顔の赤い車を中央配置したPWAアイコン |

---

## 4. 品質・容量・ライセンス検証の記録

- **合計容量**: 全27点で 138,941 bytes（約136 KiB）。`src/assets/` の26 WebPは 128,130 bytes、`public/app_icon.png` は 10,811 bytesで、1枚200 KB・合計3 MB以内の要件を満たす。
- **著作権・商標安全性**: 100% オリジナルアートワーク。実在企業のエンブレム・名称・キャラクター模倣なし。
- **後続Issueとの境界**: Issue #134は音声・保護者向け設定UI専用であり、素材は変更しない。新しい素材が必要になった場合は、素材追加専用Issueで本スタイルルールを参照する。

---

## 5. SOLUltra 再生成セッション（PR #142 / Issue #133）で使用した全文プロンプト一覧

同一スタイル参照および要件（車体配置維持、中立グレーレンズ、メニューアイコン6種の文字・ロゴ・枠カード・ウォーターマーク除外）に基づき、実際に使用した全文プロンプトを原文のまま記録します。

### 5-1. `car_dirty.webp` (400×300 WebP・透明背景)
```text
[Style Reference: car_red.webp]
Cute flat cartoon illustration for a toddler app, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
Exactly identical right-facing red car as car_red.webp with identical gentle smiling face, big eyes, wheel positions, and body shape on a 400x300 canvas.
Add organic soft brown mud splatters (#795548 and #8D6E63) and muddy spots around the lower wheels, fenders, and side doors.
Side view, centered, plain solid white background (to be removed), transparent background, no text, no logo, no watermark.
```

### 5-2. `signal.webp` (200×380 WebP・透明背景)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app, simple rounded shapes, thick soft outlines (#4A3B32).
Vertical traffic signal housing in warm dark charcoal/grey with simple rounded visor hoods.
Exactly three vertically stacked circular lenses (top, middle, bottom), all switched off in identical neutral grey color (#9E9E9E / #B0B7BD) with uniform opacity and structure designed for CSS illumination overlays.
Centered on a 200x380 canvas, plain solid white background (to be removed), transparent background, no glowing colored lights, no text, no logo, no watermark.
```

### 5-3. メニューアイコン 6種 (各300×300 WebP・透明背景)

#### 1. `menu_signal.webp` (しんごうでGO)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app menu icon, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
A friendly red smiling car facing right next to a cute traffic light with green/blue signal glow.
Centered on a 300x300 canvas, transparent background, plain solid white background (to be removed), no text, no words, no logo, no frame card border, no watermark.
```

#### 2. `menu_color-garage.webp` (いろのしゃこ)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app menu icon, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
A friendly red smiling car parked neatly in front of a matching cheerful red arched garage building.
Centered on a 300x300 canvas, transparent background, plain solid white background (to be removed), no text, no words, no logo, no frame card border, no watermark.
```

#### 3. `menu_big-small.webp` (おおきい・ちいさい)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app menu icon, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
A comparison scene showing a large friendly blue bus and a small friendly yellow car parked in size-matched parking spaces with white lines.
Centered on a 300x300 canvas, transparent background, plain solid white background (to be removed), no text, no words, no logo, no frame card border, no watermark.
```

#### 4. `menu_trace.webp` (みちをなぞろう)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app menu icon, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
A friendly green smiling car driving along a thick, clearly visible curved dashed road trace pathway.
Centered on a 300x300 canvas, transparent background, plain solid white background (to be removed), no text, no words, no logo, no frame card border, no watermark.
```

#### 5. `menu_car-wash.webp` (くるまあらい)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app menu icon, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
A cheerful muddy red car being cleaned with a soft yellow wash sponge and fluffy white soap foam bubbles.
Centered on a 300x300 canvas, transparent background, plain solid white background (to be removed), no text, no words, no logo, no frame card border, no watermark.
```

#### 6. `menu_puzzle.webp` (くるまパズル)
```text
[Style Reference: NANOBANANA Toddler Friendly Vector Style]
Cute flat cartoon illustration for a toddler app menu icon, simple rounded shapes, thick soft outlines (#4A3B32), bright cheerful colors.
A friendly smiling car visually separated into 3 crisp jigsaw puzzle pieces fitting together.
Centered on a 300x300 canvas, transparent background, plain solid white background (to be removed), no text, no words, no logo, no frame card border, no watermark.
```

---

## 6. AntiGravity SOLUltra 生成セッション（洗車QA品質向上）で使用した全文プロンプト一覧

### 6-1. `bg_car_wash.webp` (1280×960 WebP・完全不透明)
```text
[Style Reference: exec-df9ca725-755f-4932-9011-a0a85fd3bf31.png (selected design option 1)]
Cute flat cartoon illustration of an outdoor car wash station for a toddler app, 1280x960 aspect ratio 4:3, bright cheerful colors, thick soft outlines (#4A3B32), NANOBANANA style.

Scene: A friendly outdoor car wash bay viewed from the front. Light blue sky with soft white clouds at the top. Green rounded bushes and gentle hills visible on both sides behind low beige/cream walls.

The car wash structure has:
- A wide blue-grey curved roof/canopy spanning across the top
- Two white/cream vertical pillars on each side supporting the roof
- Yellow pipes/plumbing running vertically and horizontally along the pillars
- A blue shower head hanging from the right side of the yellow horizontal pipe with small blue water drops falling
- A blue coiled garden hose on the left ground connected to a yellow valve on the wall
- A blue bucket with yellow handle on the right side ground
- A grey metal drain grate centered on the ground
- Light blue water puddles on the beige/tan ground floor
- Some small brown mud spots near the puddles

The ground is a beige/tan concrete wash bay floor. The center area must be completely clear and empty (no car, no tools, no characters, no sponge, no towel, no buttons) to allow overlaying game elements.

Fully opaque background, no transparency. No text, no logo, no watermark, no characters, no vehicles, no UI elements. Warm, gentle, calming atmosphere suitable for toddlers.
```

### 6-2. `wash_hose.webp` (300×300 WebP・透明背景)
```text
[Style Reference: wash_sponge.webp, wash_towel.webp]
Cute flat cartoon illustration of a garden water hose for a toddler app icon, 300x300 canvas, transparent background, NANOBANANA style matching existing wash_sponge and wash_towel assets.

A coiled blue garden hose (#3997C9 / #448AFF blue tones) with a yellow/gold nozzle tip (#FFD740), thick soft dark brown outlines (#4A3B32, approximately 8-10pt), simple rounded shapes. The hose is loosely coiled in a circular shape. The nozzle points slightly upward to the right with 2-3 small light blue water droplets (#65CFFF) coming out.

The style must match: simple flat cartoon, thick rounded outlines in warm dark brown (#4A3B32), bright cheerful saturated colors, minimal detail, very clear silhouette readable at small sizes. Same visual weight and outline thickness as a rectangular sponge icon and a rectangular towel icon.

Plain solid white background (to be removed for transparency), centered composition, no text, no logo, no frame, no card border, no watermark.
```
