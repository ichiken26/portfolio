---
title: Bookmark Site
type: Web App
status: 公開中
summary: 自分用のリンク集を作れるサイト
imagePath: "/images/products/bookmark-site.svg"
stack:
  - Vue
  - React
  - Hono
order: 3
liveUrl: "https://ichikenbookmark.62ichiken.workers.dev/"
githubUrls: 
  "表示用フロント": "https://github.com/ichiken26/ichikenBookmark"
  "外部API": "https://github.com/ichiken26/bookMarkSiteAPI"
  "CMS": "https://github.com/ichiken26/bookMarkSiteCMS"
---

## 概要

CMSからリンク集をイジれるようにし、それを表示フロントで誰でも見れるように公開したもの

## 設計方針

- 表示フロント・外部API・CMSの3つのCloudflare Workersを立て、ビジネスロジックの責任を分離
- Cloudflare D1をDBとして使い、リレーショナルDBを実現
- ブックマークIDとカテゴリーIDを保持し、ブックマーク名とカテゴリー名が変わってもシームレスに更新できるように
- Cloudflare Zero TrustとGoogle OAuthを用いることでGoogle認証を実装し、CMSをセキュリティ的に堅牢に

## 実装ポイント

- CMSはGoogle OAuthとCloudflare Zero Trustを組み合わせ、Google認証を導入
- Cloudflare側でアクセス制限をかけ、自分以外のユーザーはCMSにログイン不可能に
- APIは外部化し、表示用フロントではGETのみ、CMSではすべてのAPIを用いる
- CRUDを丁寧に作りこみ、ドラッグアンドドロップなど、順番をソートするビジネスロジックも実装
  - orderはデフォルトでは10単位の数値で管理、入れ替えるとその中間の値に更新され、PATCHが走る
  - メモやカテゴリのorderをドラッグアンドドロップしたとき、中間の値がなくなったときはPUTとして全体更新を入れるようにし、CMSの動作を軽くするよう工夫

## メモ

普段からバックエンドを主に触っているので、CRUDの設計を丁寧にすることで設計力の向上に努めました。  
また、Google認証によるアクセス制限をかけることで、セキュリティ的にも堅牢にするようにしました。
