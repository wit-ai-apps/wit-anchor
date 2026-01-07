/**
 * APP: Anchor
 * FILE: functions/index.js
 * VERSION: v0.4.2
 * DATE(JST): 2026-01-07 12:36 JST
 * TITLE: /api/yui を Functions に接続（CORS/ルーティング安定化）
 * CHANGES:
 * - POST /api/yui を確実に受ける（/api/yui と /yui の両対応）
 * - OPTIONS を 204 応答（CORS preflight）
 * - req.body が文字列でも JSON として復元
 * - GET /api/health 追加（疎通確認）
 * AUTHOR: Yui
 */

const functions = require("firebase-functions");
const corsLib = require("cors");

// Firebase Hosting（rewrite）→ Functions で CORS が絡むので、まずは広めに許可
const cors = corsLib({ origin: true });

/**
 * OpenAI を呼ぶ（最小）
 * - 優先: process.env.OPENAI_API_KEY
 * - 代替: functions.config().openai.key（設定している場合）
 */
async function callOpenAI(prompt, style, assistant) {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    (functions.config && functions.config().openai && functions.config().openai.key) ||
    "";

  if (!apiKey) {
    return `（サーバ側に OPENAI_API_KEY が未設定です）
今の入力：
- assistant: ${assistant}
- style: ${style}
- prompt: ${String(prompt).slice(0, 200)}${String(prompt).length > 200 ? "..." : ""}

※ 次にやること：Functions の環境変数（OPENAI_API_KEY）を設定して再デプロイしてね。`;
  }

  // Node 18+ なら fetch が使える前提（Firebase Functions のランタイム設定による）
  const body = {
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          `${assistant}として返答してください。\n` +
          `口調は落ち着いた大人の女性。やさしく、フレンドリー。\n` +
          `ただし露骨な表現はしない。\n` +
          `説明は「${style}」を優先。\n` +
          `専門用語は短い補足（ ）を付ける。`,
      },
      { role: "user", content: String(prompt || "") },
    ],
    temperature: 0.4,
  };

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    return `（OpenAI呼び出しでエラー）
status=${resp.status}
${txt ? txt.slice(0, 400) : ""}`;
  }

  const data = await resp.json();
  const out =
    data &&
    data.choices &&
    data.choices[0] &&
    data.choices[0].message &&
    typeof data.choices[0].message.content === "string"
      ? data.choices[0].message.content
      : "";

  return out || "（返答が空でした）";
}

exports.api = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      // CORS preflight
      if (req.method === "OPTIONS") {
        res.status(204).send("");
        return;
      }

      // path 判定：/api/** が rewrite で来るので、/api を落として統一
      // req.path: "/yui" のこともあれば "/api/yui" のように見えることもある
      const raw = String(req.path || req.url || "");
      const rawPath = raw.split("?")[0] || "/";
      const path = rawPath.startsWith("/api/") ? rawPath.slice(4) : rawPath; // "/api" を落とす

      // 1) 疎通確認（ブラウザで開ける）
      if (path === "/health") {
        res.status(200).json({
          ok: true,
          endpoint: "api",
          path: rawPath,
          method: req.method,
          time: new Date().toISOString(),
        });
        return;
      }

      // 2) 本命：/yui
      if (path !== "/yui") {
        res.status(404).json({ error: "Not Found", path: rawPath });
        return;
      }

      if (req.method !== "POST") {
        res.status(405).json({ error: "POST only" });
        return;
      }

      // body が文字列で来るケースの保険
      let p = req.body || {};
      if (typeof p === "string") {
        try {
          p = JSON.parse(p);
        } catch (_) {
          p = {};
        }
      }

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
