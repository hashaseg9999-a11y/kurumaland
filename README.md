# KurumaLand

幼児向け車テーマ知育PWA（日本語・英語・タイ語、オフライン対応）。色・形・大小の認知と手先の操作（微細運動）を育てるWebアプリケーションです。

- **リポジトリ**: `hashaseg9999-a11y/kurumaland`
- **公開URL**: [https://hashaseg9999-a11y.github.io/kurumaland/](https://hashaseg9999-a11y.github.io/kurumaland/)
- **デフォルトブランチ**: `main`

---

## 目的

1歳8ヶ月の幼児向け・車テーマの知育PWA。
日本語・英語・タイ語の3言語音声対応。iPad Safari（ホーム画面追加）で全画面・オフライン動作。

## 状態

8種類のアクティビティ、3言語音声、保護者向け設定、おしまいタイマーを実装済み。
`main` ブランチに反映されると GitHub Actions（`.github/workflows/deploy.yml`）が自動ビルドし、GitHub Pages へ公開します。

## 技術スタック

- Vite + TypeScript (Vanilla TS、フレームワークなし)
- PWA (`vite-plugin-pwa`) / GitHub Pages 配信（Vite base: `/kurumaland/`）
- 画像素材: SVGベクター画像 + 背景WebP
- 音声: Web Speech API (ja / en / th)

## 設計ドキュメント

実装前に必ず [docs/DESIGN.md](docs/DESIGN.md) を確認してください。全アクティビティ共通のインターフェース、音声API、素材命名規約、非ドーパミン設計原則が定義されています。

## 起動方法

```bash
npm install
npm run dev
```

ターミナルに表示されるURLをブラウザで開きます。iPadから確認する場合は、開発PCと同じネットワークに接続し、Network欄のURLをSafariで開きます。

## 遊び方

絵をタップして、次の8種類から遊びを選びます。

- しんごうで GO!
- いろの しゃこ
- おおきい・ちいさい
- みちを なぞろう
- くるまあらい
- くるま パズル
- おとと ひかり
- ならべて れっしゃ

画面左上の家ボタンで、いつでも遊びの選択画面に戻れます。

## 言語とおしまいタイマー

1. 画面右上の歯車を3秒間長押しします。
2. 日本語・英語・タイ語・順番のいずれかを選びます。
3. 必要に応じて、おしまいタイマーを「なし・10分・20分・30分」から選びます。
4. 音声は「テスト発話」で確認し、「閉じる」で遊びに戻ります。

「順番」は、発話するたびに日本語→英語→タイ語の順で切り替わります。タイ語音声が端末にない場合は、エラーを出さず無音で遊びを続けます。

タイマーの時間が来ても遊びの途中では止まらず、課題が終わってから車が車庫へ戻り、「おしまい」画面になります。再開は右上の歯車を3秒長押しし、保護者向け設定の「遊びを再開」を押します。

## 検証コマンド

```bash
npm run typecheck
npm run build
npm run verify
```

本番ビルドのローカル確認:

```bash
npm run preview
```

## iPad Safariでの使い方

1. Safariで KurumaLand を開く。
2. 共有ボタンから「ホーム画面に追加」を選ぶ。
3. ホーム画面のアイコンから起動し、iPadを横向きにする。
4. 最初に画面を1回タップして音声を有効にする。

縦向きでは「よこにしてね」画面を表示します。一度オンラインで開いて読み込みが完了した後は、ホーム画面のアイコンからオフラインでも起動できます。

## GitHub Pagesへの公開

`main` ブランチへ push されると、`.github/workflows/deploy.yml` が次を自動実行します。

1. `npm ci`
2. `npm run build`
3. `dist` を GitHub Pages へデプロイ
