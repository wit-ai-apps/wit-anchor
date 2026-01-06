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
