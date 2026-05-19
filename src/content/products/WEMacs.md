---
title: WEMacs
type: Console App
status: 制作中
summary: WindowsにEmacsキーバインド風のショートカットを追加するためのコンソールアプリ
imagePath: "/images/products/dummy-blue.svg"
stack:
  - C#
  - .NET
order: 4
liveUrl: "https://github.com/ichiken26/WEmacs"
githubUrls:
  "App": "https://github.com/ichiken26/WEmacs"
---

## 概要

.NETで動く、WindowsにEmacsキーバインド風のショートカットを追加するためのコンソールアプリです。

## 実装ポイント

- CapsLockキーをF13キーとして変換
- CapsLockにはKeyUpがなく、KeyDownしかないので物理キーのKeyUp, Downとして認識
- それでも順番をうまく認識してくれないので、F13キーのKeyUpとKeyDownの制御タイミングを、物理キーのKeyDownが押されてからそれを一定時間検知しなくなるまでの時間をタイマーとして保持してシステム側で信号を完全に制御

## メモ

CapsLockキーが元々トグルのキーなので挙動に癖があり、デバッグがとても大変でした。
ひとまずのCapsLockキーの制御方法を探る山場は超えたので、後は環境によってどのくらい挙動に差が出るかを手の空いたときに検証予定
