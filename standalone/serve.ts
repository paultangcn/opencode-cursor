/**
 * Standalone Cursor OpenAI-compatible proxy (no OpenCode TUI needed).
 * Usage: CURSOR_PROXY_PORT=8766 bun standalone/serve.ts
 * Reads credentials written by standalone/login.ts and auto-refreshes them.
 */
import { getTokenExpiry, refreshCursorToken } from "../src/auth";
import { getCursorModels } from "../src/models";
import { startProxy } from "../src/proxy";

const AUTH_PATH = `${process.env.HOME}/.local/share/opencode/auth.json`;

interface StoredAuth {
  type: string;
  refresh: string;
  access: string;
  expires: number;
}

async function readStore(): Promise<Record<string, unknown>> {
  return JSON.parse(await Bun.file(AUTH_PATH).text());
}

async function getAccessToken(): Promise<string> {
  const store = await readStore();
  const auth = store.cursor as StoredAuth | undefined;
  if (!auth?.refresh) throw new Error("没有 Cursor 凭证，先运行 bun standalone/login.ts");
  if (auth.access && auth.expires > Date.now()) return auth.access;
  const refreshed = await refreshCursorToken(auth.refresh);
  store.cursor = { type: "oauth", ...refreshed };
  await Bun.write(AUTH_PATH, JSON.stringify(store, null, 2));
  return refreshed.access;
}

const port = await startProxy(getAccessToken);
console.log(`cursor proxy listening on http://127.0.0.1:${port}/v1`);

try {
  const models = await getCursorModels(await getAccessToken());
  console.log("可用模型：" + models.map((model) => model.id).join(", "));
} catch (error) {
  console.log("模型列表获取失败（不影响代理使用）：" + String(error));
}
