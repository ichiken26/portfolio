# KOKAGE Portfolio 本番設定手順

この文書では、KOKAGE PortfolioとCMS APIをCloudflareへ安全に公開するまでの設定を、操作順に説明します。

## 使用するURL

- 公開サイト: `https://kokage-studio.com/`
- CMS: `https://kokage-studio.com/admin/`
- API: `https://api.kokage-studio.com/api/v1`
- APIヘルスチェック: `https://api.kokage-studio.com/api/v1/health`

`kokage-stuidio.com`ではありません。ドメインの綴りに注意してください。

## 1. 事前準備

次を用意します。

- `kokage-studio.com`を管理するCloudflareアカウント
- Cloudflareアカウントの二要素認証
- Cloudflare Zero Trust組織
- CMSへのアクセスを許可するGoogleアカウント
- フロント用GitHubリポジトリ
- `https://github.com/ichiken26/portfolioAPI`リポジトリ
- Node.js 22.12以上
- npm
- Git

バージョンを確認します。

```bash
node --version
npm --version
git --version
```

## 2. Cloudflareへログインする

APIディレクトリへ移動します。

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
```

依存関係をインストールします。

```bash
npm ci
```

WranglerでCloudflareへログインします。

```bash
npx wrangler login
```

ブラウザが開いたら、`kokage-studio.com`を管理しているCloudflareアカウントを選択して認可します。

ログイン先を確認します。

```bash
npx wrangler whoami
```

複数アカウントを所有している場合は、Account名とAccount IDが正しいことを確認します。

## 3. Cloudflare Zoneを確認する

Cloudflare Dashboardで次を確認します。

1. `Websites`を開く
2. `kokage-studio.com`を選択する
3. Zoneの状態が`Active`であることを確認する
4. ネームサーバーがCloudflare指定値になっていることを確認する
5. SSL/TLSが有効であることを確認する

Custom Domainを使うため、同じホスト名の不要なCNAMEや既存Worker Routeがないことも確認します。

## 4. D1データベースを作成する

APACをlocation hintとして`portfolio`データベースを作成します。

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
npx wrangler d1 create portfolio --location=apac
```

成功すると、次のような設定が表示されます。

```json
{
  "binding": "DB",
  "database_name": "portfolio",
  "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

表示された`database_id`を控えます。

`portfolioAPI/wrangler.jsonc`を開き、次を置換します。

```json
"database_id": "REPLACE_WITH_D1_DATABASE_ID"
```

置換後の例です。

```json
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "portfolio",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "migrations_dir": "migrations"
  }
]
```

設定を確認します。

```bash
npx wrangler d1 info portfolio
```

## 5. R2バケットを作成する

Cloudflare Dashboardで`R2 Object Storage`を開き、初回の場合はR2を有効化します。

CLIで画像用バケットを作成します。

```bash
npx wrangler r2 bucket create portfolio-images
```

作成結果を確認します。

```bash
npx wrangler r2 bucket list
```

一覧に`portfolio-images`が存在することを確認します。

`portfolioAPI/wrangler.jsonc`には次のbindingが設定済みです。

```json
"r2_buckets": [
  {
    "binding": "IMAGES",
    "bucket_name": "portfolio-images"
  }
]
```

バケット自体を公開バケットにする必要はありません。画像はAPI Workerを経由して配信します。

## 6. Zero Trust組織を準備する

Cloudflare Dashboardで次を行います。

1. `Zero Trust`を開く
2. 初回の場合は組織を作成する
3. Team nameを設定する
4. Free planまたは利用するplanを選択する
5. `Settings`でTeam domainを確認する

この環境で確認済みのTeam domainは次の値です。

```text
cold-salad-4ada.cloudflareaccess.com
```

`portfolioAPI/wrangler.jsonc`の次を置換します。

```json
"ACCESS_TEAM_DOMAIN": "REPLACE_WITH_TEAM.cloudflareaccess.com"
```

設定済みの値です。

```json
"ACCESS_TEAM_DOMAIN": "cold-salad-4ada.cloudflareaccess.com"
```

`https://`と末尾の`/`は付けません。

## 7. APIの本番環境変数を確認する

`portfolioAPI/wrangler.jsonc`を確認します。

本番CORSは次の値を推奨します。

```json
"ALLOWED_ORIGINS": "https://kokage-studio.com"
```

ローカル開発も同じ設定ファイルで行う場合は、現在の次の値でも動作します。

```json
"ALLOWED_ORIGINS": "https://kokage-studio.com,http://localhost:4321"
```

本番で`DEV_AUTH_BYPASS`を有効にしてはいけません。

```json
"DEV_AUTH_BYPASS": "false"
```

`ACCESS_AUD`には作成済みApplicationのAudience Tag
`5f705bd65c4d9c20962a4252f4739e10d2123a12294f3531937e208c64d724a1`を設定済みです。

## 8. D1 migrationを本番へ適用する

適用予定を確認します。

```bash
npx wrangler d1 migrations list portfolio --remote
```

次のmigrationが表示されます。

- `0001_initial.sql`
- `0002_seed.sql`
- `0003_correct_production_domain.sql`

本番D1へ適用します。

```bash
npx wrangler d1 migrations apply portfolio --remote
```

適用結果を確認します。

```bash
npx wrangler d1 migrations list portfolio --remote
```

コンテンツを確認します。

```bash
npx wrangler d1 execute portfolio --remote \
  --command="SELECT kind, published, version FROM content ORDER BY kind;"
```

製品データを確認します。

```bash
npx wrangler d1 execute portfolio --remote \
  --command="SELECT slug, published, sort_order, json_extract(data, '$.liveUrl') AS live_url FROM products ORDER BY sort_order;"
```

`portfolio-site`のURLが`https://kokage-studio.com`であることを確認します。

## 9. APIを検証する

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

すべて成功し、`npm audit`が`0 vulnerabilities`になることを確認します。

## 10. API Workerを初回デプロイする

APIをデプロイします。

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
npm run deploy
```

この初回デプロイはCustom Domainを作るためのものです。`ACCESS_AUD`が未設定なので、管理APIはまだ認証成功しません。

Cloudflare Dashboardで次を確認します。

1. `Workers & Pages`を開く
2. `portfolio-api`を選択する
3. `Settings`を開く
4. `Domains & Routes`を開く
5. `api.kokage-studio.com`がActiveであることを確認する

同名のCNAMEが存在してCustom Domain作成に失敗した場合は、DNS画面で既存レコードを確認します。既存のサービスが使っていないことを確認できた場合だけ削除し、再デプロイします。

ヘルスチェックを実行します。

```bash
curl -i https://api.kokage-studio.com/api/v1/health
```

期待する本文です。

```json
{"status":"ok"}
```

公開コンテンツを確認します。

```bash
curl -i https://api.kokage-studio.com/api/v1/content/about
```

## 11. フロントを検証する

```bash
cd /home/ichiken/my-portfolio/portfolio
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

`portfolio/wrangler.jsonc`に次が設定されていることを確認します。

```json
"routes": [
  {
    "pattern": "kokage-studio.com",
    "custom_domain": true
  }
],
"vars": {
  "PUBLIC_API_BASE_URL": "https://api.kokage-studio.com/api/v1"
}
```

## 12. フロントWorkerをデプロイする

```bash
cd /home/ichiken/my-portfolio/portfolio
npx wrangler deploy
```

Cloudflare Dashboardで次を確認します。

1. `Workers & Pages`を開く
2. `kokage-portfolio`を選択する
3. `Settings`を開く
4. `Domains & Routes`を開く
5. `kokage-studio.com`がActiveであることを確認する

公開サイトを確認します。

```bash
curl -I https://kokage-studio.com/
```

ブラウザで次を開きます。

- `https://kokage-studio.com/`
- `https://kokage-studio.com/about/`
- `https://kokage-studio.com/tech-stack/`
- `https://kokage-studio.com/products/`

## 13. Google Identity Providerを設定する

Cloudflare Dashboardで次を行います。

1. `Zero Trust`を開く
2. `Integrations`を開く
3. `Identity providers`を開く
4. `Add new identity provider`を選択する
5. 通常のGoogle OAuthなら`Google`を選択する
6. Workspaceグループを利用する場合は`Google Workspace`を選択する

Google Cloud Consoleで次を行います。

1. 対象Projectを選択または作成する
2. `APIs & Services`を開く
3. `OAuth consent screen`を設定する
4. `Credentials`を開く
5. `Create Credentials`を選択する
6. `OAuth client ID`を選択する
7. Application typeで`Web application`を選択する
8. Cloudflare画面に表示されたCallback URLを`Authorized redirect URIs`へ登録する

Callback URLは推測せず、Cloudflare画面からコピーしてください。

Googleが発行した次の値をCloudflareへ入力します。

- Client ID
- Client Secret

Client SecretをGit、`.env`、Wrangler設定へ保存してはいけません。

保存後、CloudflareのIdentity providers画面で`Test`を実行し、Googleログインが成功することを確認します。

## 14. Access Applicationを作成する

Cloudflare Dashboardで次を行います。

1. `Zero Trust`を開く
2. `Access controls`を開く
3. `Applications`を開く
4. `Add an application`または`Create new application`を選択する
5. `Self-hosted`を選択する

Application nameの例です。

```text
KOKAGE Portfolio CMS
```

フロントCMSのpublic destinationを追加します。

```text
kokage-studio.com/admin/*
```

画面が分割入力の場合は次を指定します。

- Hostname: `kokage-studio.com`
- Path: `/admin/*`

同じApplicationへAPI管理パスも追加します。

```text
api.kokage-studio.com/api/v1/admin/*
```

画面が分割入力の場合は次を指定します。

- Hostname: `api.kokage-studio.com`
- Path: `/api/v1/admin/*`

次の公開APIはAccess保護対象に含めません。

- `/api/v1/health`
- `/api/v1/content/*`
- `/api/v1/products`
- `/api/v1/products/*`
- `/api/v1/images/*`

Session durationは、まず`8 hours`程度を推奨します。

## 15. Access Policyを作成する

Application内でPolicyを追加します。

- Policy name: `Allow portfolio administrators`
- Action: `Allow`
- Include selector: `Emails`
- Value: CMS利用を許可するGoogleメールアドレス

ドメイン全体を許可すると対象ドメインの全ユーザーへCMS権限が付くため、必要性がなければメールアドレス完全一致を使用します。

Login methodは作成したGoogle IdPに限定します。利用可能ならMFAも要求します。

Policyを保存し、Applicationの作成を完了します。

## 16. Access AUDを設定する

作成したAccess ApplicationのOverviewまたは詳細画面から、次の値を取得します。

```text
Application Audience (AUD) Tag
```

この環境では次の値を設定済みです。

```json
"ACCESS_AUD": "5f705bd65c4d9c20962a4252f4739e10d2123a12294f3531937e208c64d724a1"
```

APIはこの値でデプロイ済みです。値を変更した場合だけ再デプロイします。

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
npm run deploy
```

## 17. AccessのCORS設定を行う

CMSは`kokage-studio.com`から`api.kokage-studio.com`へPUT、POST、DELETE要求を送るため、OPTIONS preflightが発生します。

Access Applicationで次を設定します。

1. `Zero Trust`を開く
2. `Access controls`を開く
3. `Applications`を開く
4. `KOKAGE Portfolio CMS`を開く
5. `Configure`を選択する
6. `Advanced settings`を開く
7. `Cross-Origin Resource Sharing (CORS) settings`を開く
8. `Bypass OPTIONS requests to origin`を有効にする

Access policy全体をBypassにしてはいけません。OPTIONSだけをoriginへ通します。API側ではHonoのCORS allowlistが引き続き適用されます。

## 18. Access認証を確認する

最初にAPI側のAccess cookieを作成します。

ブラウザで次を開きます。

```text
https://api.kokage-studio.com/api/v1/admin/products
```

Googleログインを行い、認証後にJSONが表示されることを確認します。

続いてCMSを開きます。

```text
https://kokage-studio.com/admin/
```

シークレットウィンドウでも開き、未認証状態ではGoogle認証画面へ移動することを確認します。

Access policyに含まれていないGoogleアカウントでは拒否されることも確認します。

## 19. CMSを動作確認する

### About

1. `/admin/about/`を開く
2. 概要を編集する
3. 1秒以上待つ
4. `保存中…`から`保存済み`へ変わることを確認する
5. 再読み込みする
6. 編集内容が保持されていることを確認する
7. 表、箇条書き、リンク付き箇条書きを追加・削除する

### Tech Stack

1. `/admin/tech-stack/`を開く
2. 大項目を追加する
3. 技術項目を追加する
4. 技術名、対応レベル、タグを入力する
5. 自動保存後に再読み込みする

### Products

1. `/admin/products/`を開く
2. slugを入力して製品を追加する
3. 製品カードから詳細画面へ移動する
4. タイトル、概要、種別、ステータス、タグを入力する
5. 公開URLと複数のGitHub URLを入力する
6. Markdown記事を編集する
7. プレビューから危険なHTMLが除去されることを確認する

### 画像

1. 5MiB以下のJPEG、PNG、またはGIFを選択する
2. ドラッグ＆ドロップでもアップロードできることを確認する
3. 保存後に再読み込みする
4. 画像が表示されることを確認する
5. SVGが拒否されることを確認する
6. 5MiB超過ファイルが拒否されることを確認する

### 公開制御

1. `公開する`をOFFにする
2. 保存完了を待つ
3. 公開ページまたは公開APIから対象が表示されないことを確認する
4. `公開する`をONに戻す
5. 公開ページへ反映されることを確認する

## 20. Cloudflare API Tokenを作成する

Cloudflare Dashboardで次を行います。

1. プロフィールを開く
2. `API Tokens`を開く
3. `Create Token`を選択する
4. `Edit Cloudflare Workers` templateを選択する
5. Token名を入力する
6. 対象Accountを本番Accountだけに限定する
7. 対象Zoneを`kokage-studio.com`だけに限定する

APIリポジトリではD1 migrationも実行するため、templateに含まれていない場合は次の権限を追加します。

- Account / D1 / Edit
- Account / Workers R2 Storage / Edit
- Workers Scriptsの編集権限
- Custom DomainまたはWorkers routeの更新に必要な権限

Tokenを作成し、表示された値をパスワードマネージャーへ保存します。

TokenをGitリポジトリへ保存してはいけません。

Account IDは次で確認できます。

```bash
npx wrangler whoami
```

## 21. GitHub Environmentを作成する

フロントとAPIの両リポジトリで個別に行います。

1. GitHubリポジトリを開く
2. `Settings`を開く
3. `Environments`を開く
4. `New environment`を選択する
5. 名前に`production`を入力する
6. `Configure environment`を選択する

推奨保護設定です。

- Deployment branchesを`main`だけに限定する
- 必要ならRequired reviewersを設定する

## 22. GitHub Secretsを登録する

`production` Environmentの`Environment secrets`に次を登録します。

### CLOUDFLARE_ACCOUNT_ID

- Name: `CLOUDFLARE_ACCOUNT_ID`
- Value: Cloudflare Account ID

### CLOUDFLARE_API_TOKEN

- Name: `CLOUDFLARE_API_TOKEN`
- Value: 作成したCloudflare API Token

フロントとAPIは別リポジトリなので、両方へ登録します。一方のリポジトリへ登録したEnvironment secretを、もう一方のリポジトリから利用することはできません。

## 23. APIリポジトリをGitHubへ接続する

`portfolioAPI`にまだ`.git`がない場合は、先にリモートの状態を確認します。

```bash
git ls-remote https://github.com/ichiken26/portfolioAPI.git
```

空リポジトリであることを確認できた場合は、ローカルを初期化します。

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
git init -b main
git remote add origin https://github.com/ichiken26/portfolioAPI.git
git remote -v
```

commit対象を確認します。

```bash
git status
```

次が含まれていないことを確認します。

- `node_modules`
- `.dev.vars`
- `.wrangler`
- `dist`
- Cloudflare API Token
- Google Client Secret

検証します。

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

内容を確認してcommitします。

```bash
git add .
git diff --cached
git commit -m "Implement portfolio CMS API"
```

リモートが空の場合にpushします。

```bash
git push -u origin main
```

リモートに既存commitがある場合はforce pushせず、先に確認します。

```bash
git fetch origin
git log --oneline --all --decorate -10
```

## 24. フロントリポジトリをGitHubへ反映する

remoteを確認します。

```bash
cd /home/ichiken/my-portfolio/portfolio
git remote -v
```

差分を確認します。

```bash
git status
git diff --stat
```

検証します。

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

内容を確認してcommitします。

```bash
git add .
git diff --cached
git commit -m "Add Cloudflare CMS and dynamic portfolio"
```

pushします。

```bash
git push origin main
```

## 25. GitHub Actionsを確認する

APIリポジトリで次を行います。

1. `Actions`を開く
2. `CI` workflowを開く
3. 最新runを開く
4. `verify`が成功していることを確認する
5. `deploy`が成功していることを確認する

API workflowは次を実行します。

- `npm ci`
- lint
- typecheck
- test
- build
- D1 remote migration
- Worker deploy

フロントリポジトリでも同様に`verify`と`deploy`を確認します。

EnvironmentにRequired reviewersを設定した場合は、`Review deployments`から`production`を承認します。

## 26. 本番最終確認

### APIヘルスチェック

```bash
curl -fsS https://api.kokage-studio.com/api/v1/health
```

期待値です。

```json
{"status":"ok"}
```

### 公開API

```bash
curl -fsS https://api.kokage-studio.com/api/v1/content/about
curl -fsS https://api.kokage-studio.com/api/v1/content/tech-stack
curl -fsS https://api.kokage-studio.com/api/v1/products
```

### 未認証管理API

```bash
curl -i https://api.kokage-studio.com/api/v1/admin/products
```

未認証で管理用JSONが返ってはいけません。Cloudflare Accessの認証レスポンスまたは401になることを確認します。

### ブラウザ確認

1. `https://kokage-studio.com/`を開く
2. `https://kokage-studio.com/admin/`を開く
3. Googleでログインする
4. Aboutを編集して自動保存を確認する
5. Tech Stackを編集する
6. Productを追加・編集する
7. 画像をアップロードする
8. 公開・非公開を切り替える
9. 公開サイトへ反映されることを確認する

## 27. ログと障害対応

APIで問題がある場合は次の順で確認します。

1. `https://api.kokage-studio.com/api/v1/health`
2. Cloudflare WorkersのLogs
3. Access Applicationのdestination
4. Access Policyの許可メールアドレス
5. `ACCESS_TEAM_DOMAIN`
6. `ACCESS_AUD`
7. Access CORSのOPTIONS設定
8. APIの`ALLOWED_ORIGINS`
9. D1 migration適用状況
10. R2 binding名とbucket名

D1 migration状況は次で確認します。

```bash
cd /home/ichiken/my-portfolio/portfolioAPI
npx wrangler d1 migrations list portfolio --remote
```

Cloudflare Dashboardでは次も確認します。

- Workers & Pagesのdeployment status
- Worker Logs
- Zero TrustのAccess logs
- D1 Databaseの状態
- R2 bucketのオブジェクト
- Custom Domainの証明書状態

## 28. セキュリティ確認表

本番公開前にすべて確認します。

- [ ] Cloudflareアカウントで二要素認証が有効
- [ ] `DEV_AUTH_BYPASS`が`false`
- [ ] Access Policyが特定メールアドレスだけを許可
- [ ] `/admin/*`がAccess保護対象
- [ ] `/api/v1/admin/*`がAccess保護対象
- [ ] OPTIONSだけがAccess bypass対象
- [ ] 公開APIはAccess保護対象外
- [ ] `ALLOWED_ORIGINS`が`https://kokage-studio.com`を許可
- [ ] Cloudflare API Tokenが最小権限
- [ ] GitHub Secretsが`production` Environmentに保存済み
- [ ] `.dev.vars`がGit管理対象外
- [ ] Google Client SecretがGit管理対象外
- [ ] 未認証管理APIが拒否される
- [ ] 非公開コンテンツが公開APIから取得できない
- [ ] JPEG、PNG、GIF以外の画像が拒否される
- [ ] 5MiB超過画像が拒否される
- [ ] `npm audit`が0 vulnerabilities
