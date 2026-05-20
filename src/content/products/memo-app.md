---
title: Memo App
type: Web App
status: 制作中
summary: Googleアカウントごとにタグ付けされたメモを作れるWebアプリ
imagePath: "/images/products/memoapplogo.svg"
stack:
  - Nuxt
  - Cloudflare Workers
  - Cloudflare D1
  - Firebase
order: 2
liveUrl: "https://memo-app.62ichiken.workers.dev/"
githubUrls: 
  "Source": "https://github.com/ichiken26/memo-app"
---

## 概要

仕事用とプライベート用とでメモを分けたいと思い、開発したメモアプリ


## 実装ポイント

- コンポーネントごとの責務を小さく分ける
- Firebase Authを用いて開発者側でOAuth画面を作成することでユーザー情報を受け取りやすくし、タグとそれに紐づけられたメモを、ユーザーごとに関連付けてCloudflare D1に保存

## メモ

新人研修用に作ったものですが、コンポーネントごとのpropsなどのデータの理解、NoSQLにも転用できるIDによる紐づけの考え方、コンポーネントを作ってそれを流用するというNuxtの基本的な考え方を万遍なく学ぶことができる点で優れたプロジェクトだと感じている。  
