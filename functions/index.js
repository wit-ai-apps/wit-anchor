/**
 * APP: Anchor (wit-anchor)
 * FILE: functions/index.js
 * VERSION: v0.4.2-hf1
 * DATE(JST): 2026-01-07 13:21 JST
 * TITLE: /api/health をJSON固定 + POST /api/yui 1本化（Functions側ルーティング）
 * AUTHOR: Yui
 * CHANGES:
 * - GET /api/health を 200 JSON で返す（HostingのSPAに吸われてないか確認できる）
 * - POST /api/yui を追加（画面→Functions→AI→画面の最短導線）
 * - 既存の POST only を /api/yui にだけ適用（healthはGET許可）
 */

const functions = require("firebase-functions");
const corsLib = require("cors");

// CORS: 必要なら origin を絞れる（いまは広め）
const cors = corsLib({ origin: true });

// ▼ OpenAIのキーは Actions/Secrets から環境変数で渡す前提
//   workflow で OPENAI_API_KEY を env に入れているなら process.env で取れる
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// --- ここが “1本” の Functions エンドポイント ---
// firebase.json の rewrites: /api/** -> function: "api"
exports.api = functions.https.onRequest(async (req, res) => {
  return cors(req, res, async () => {
    try {
      const path = (req.path || "").toLowerCase();

      // 1) Health（GET許可）: JSONが返れば “/api/** がFunctionsに届いている” 合図
      if (path === "/health" || path === "/api/health") {
        res.status(200).json({
          ok: true,
          app: "Anchor",
          version: "v0.4.2-hf1",
          ts: new Date().toISOString(),
          note: "If you see this JSON, Hosting rewrite /api/** -> Functions is working.",
        });
        return;
      }

      // 2) Yui自動返信（POSTのみ）
      if (path === "/yui" || path === "/api/yui") {
        if (req.method !== "POST") {
          res.status(405).json({ error: "POST only" });
          return;
        }

        const p = req.body || {};
        const prompt = String(p.prompt || "");
        const style = String(p.style || "1アクション・スモールステップ");
        const assistant = String(p.assistant || "ユイ");

        const reply = await callOpenAI(prompt, style, assistant);
        res.status(200).json({ reply });
        return;
      }

      // 3) それ以外
      res.status(404).json({
        error: "Not found",
        hint: "Use GET /api/health or POST /api/yui",
        path: req.path || "",
      });
    } catch (e) {
      res.status(500).json({ error: String(e && e.message ? e.message : e) });
    }
  });
});

// --- OpenAI 呼び出し（最小） ---
async function callOpenAI(userPrompt, style, assistantName) {
  if (!OPENAI_API_KEY) {
    return `（サーバ設定）OPENAI_API_KEY が未設定です。Secrets/Actionsの env を確認してね。`;
  }

  const system = [
    `${assistantName}として返答してください。`,
    `回答方針: ${style}`,
    `日本語で。短く、次の1手が分かる形で。`,
  ].join("\n");

  const body = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
  };

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text();
    return `（OpenAIエラー）status=${r.status} body=${t.slice(0, 500)}`;
  }

  const j = await r.json();
  const out =
    (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
  return String(out).trim() || "（空の返答でした）";
}
