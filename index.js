/**
 * APP: Anchor (Programming AI Dev Assistant)
 * FILE: functions/index.js
 * VERSION: v0.4.0
 * DATE(JST): 2026-01-06 11:30 JST
 * TITLE: ユイ自動返信 API（Firebase Functions → OpenAI）
 * AUTHOR: Yui
 *
 * NOTE:
 * - ここにAPIキーを直書きしないこと（GitHub Secret / Firebase Secretを使用）
 */
const functions = require("firebase-functions");
const cors = require("cors")({ origin: true });

// v2環境では process.env から取得できる想定（GitHub Actionsでセット）
// 例: OPENAI_API_KEY, OPENAI_MODEL
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini"; // 例。必要に応じて変更。

async function callOpenAI(prompt, style, assistantName) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY が未設定です（GitHubのSecretsに追加して再デプロイ）");
  }
  const sys =
    `あなたは「${assistantName}」です。` +
    `ユーザーは初心者なので、必ず「次の1アクション」を1つだけ提示してください。` +
    `専門用語は短い説明を（）で添えてください。` +
    `口調は落ち着いた大人の女性で、フレンドリーに。` +
    `\n\nスタイル: ${style}`;

  const body = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: String(prompt || "") }
    ],
    temperature: 0.3
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const t = await res.text().catch(()=>"");
    throw new Error("OpenAI API error: " + res.status + " " + t.slice(0, 300));
  }
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content || "";
  return String(reply || "");
}

exports.api = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
      }
      const p = req.body || {};
      const prompt = p.prompt || "";
      const style = p.style || "1アクション・スモールステップ";
      const assistant = p.assistant || "ユイ";

      const reply = await callOpenAI(prompt, style, assistant);
      res.status(200).json({ reply });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });
});
