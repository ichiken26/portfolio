# KOKAGE Portfolio / CMS

Astro 6のCloudflare SSRサイトです。公開画面はPortfolio APIの公開済みコンテンツを表示し、`/admin`以下のCMSは1秒間入力が止まると自動保存します。既存の視覚デザインを保ちつつ、About、Tech Stack、Productsと各Product記事を編集できます。

## ローカル開発

Node.js 22.12以上と、隣接する `portfolioAPI` が必要です。

```sh
npm ci
cp .env.example .env
npm run dev
```

APIを `http://localhost:8787`、フロントを `http://localhost:4321` で起動します。公開APIが停止している場合、トップ・一覧・About・Tech Stackはリポジトリ内の安全な既定値を表示します。個別Productは非公開情報の漏洩を避けるため404になります。

## 管理画面

- `/admin/`: セクション一覧
- `/admin/about/`: 概要、テキスト、表、一覧、リンク一覧
- `/admin/tech-stack/`: 大項目と技術項目
- `/admin/products/`: 一覧設定と製品追加・削除
- `/admin/products/:slug/`: メタデータ、画像、複数GitHub URL、Markdown本文と安全なプレビュー

保存競合はAPIが409を返し、CMSに失敗として表示されます。他タブの変更を上書きせず再読み込みが必要です。画像はAPI側でJPEG/PNG/GIFと5MiB制限を検証します。

## 本番設定とデプロイ

1. `PUBLIC_API_BASE_URL=https://api.kokage-studio.com/api/v1` を設定します。
2. Cloudflare Zero TrustでGoogle IdPを設定し、`kokage-studio.com/admin/*` をAccess Applicationで保護します。API側の管理パスも同じポリシーで保護します。
3. `wrangler.jsonc` のcustom domainを確認し、DNS/証明書がActiveになってからdeployします。
4. GitHub Environment `production` に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を登録します。tokenは対象Workerの編集に必要な最小権限にします。
5. mainへのpushでCI成功後にCDが走ります。API migrationを先に適用してからフロントを公開します。

本番ドメインは `kokage-studio.com`、APIドメインは `api.kokage-studio.com` です。

## セキュリティ・運用

管理権限はUIの非表示ではなくCloudflare AccessとAPI JWT検証で強制します。Markdownは生HTML、画像、危険なURLスキームをレンダラーで除外します。秘密値はリポジトリへ保存しません。Access AUDとD1 IDはリソース識別子であり、秘密情報としては扱いません。

公開データが更新されない場合はAPI health、Access policy、CORS、D1 migration、Worker logsの順に確認します。API障害時の既定表示が長期間続かないよう監視を設定してください。復旧後はCMSのversionを確認してから再保存します。

## 検証

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

APIのREADMEも参照し、ステージングでGoogle login、非認証401、公開/非公開切替、競合409、画像形式拒否、モバイル表示を確認してください。
