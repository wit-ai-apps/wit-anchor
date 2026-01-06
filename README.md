# Anchor（wit-anchor）

プログラミングAI支援アプリ

Anchor は、複数のプロジェクト（例：Lino / Smart Price / NoteLink など）を
**壊さず・迷わせず・早く直す**ための「プログラミング支援アプリ」です。

---

## 目的（Anchor が守るもの）

- **本番（奥さま運用）を絶対に壊さない**
- 開発側（なべちょうさん／ユイ）の作業を **stable に隔離**する
- OK が出たものだけを **stable → main** で本番へ反映する
- 変更履歴を残し、いつでも戻せる状態を保つ

---

## 役割（ブランチ運用）

### main（本番）
- 奥さまに渡す URL は **main のみ**
- main は **直接編集しない**
- 反映は必ず **stable から Promote（コピー）**で行う

### stable（作業）
- 修正・検証・履歴はすべて stable
- 失敗しても main に影響しない
- 採用判断と比較は stable を中心に行う

---

## Anchor が提供する最小機能（迷わない設計）

- Pull（main）：本番の現行を読む
- Pull（stable）：作業中を読む
- Commit（stable）：採用＝stableへ保存
- Promote（stable → main）：stable の最新を main に反映
- History：stable/main の履歴（比較用）

---

## 絶対ルール（事故防止）

- **本番を直で触らない（main直編集禁止）**
- 修正は必ず stable →（OK）→ main
- UI は必要最小限（「押すボタンが少ないほど正しい」）
- 迷う操作は作らない（運用が増えるだけの機能は入れない）

---

## 状態（いまのフェーズ）
- フェーズ：骨格確定（ブランチ運用の固定）
- 次：Anchor 本体（支援アプリ）の最小プロトタイプ作成


# Anchor (wit-anchor)

- hosting: /app (index.html)
- functions: /functions (API proxy)

## Secrets (GitHub → Settings → Secrets and variables → Actions)
- FIREBASE_SERVICE_ACCOUNT_WIT_ANCHOR : JSON全文
- OPENAI_API_KEY : OpenAI API key
- OPENAI_MODEL : (任意) 例 gpt-4.1-mini

## Deploy
stable ブランチにpushすると Actions で Firebaseへ deploy します。

## MD支援
- 自然語入力を送信前にMD整形（原文＋MD）してユイへ送ります。
