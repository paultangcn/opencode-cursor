/**
 * Standalone Cursor OAuth login (no OpenCode TUI needed).
 * Usage: bun standalone/login.ts
 * Saves credentials to ~/.local/share/opencode/auth.json under "cursor",
 * the same location/format the OpenCode plugin uses.
 */
import { generateCursorAuthParams, getTokenExpiry, pollCursorAuth } from "../src/auth";

const AUTH_PATH = `${process.env.HOME}/.local/share/opencode/auth.json`;

const { verifier, uuid, loginUrl } = await generateCursorAuthParams();
console.log("在浏览器中完成 Cursor 登录（已尝试自动打开）：\n" + loginUrl + "\n");
Bun.spawn(["open", loginUrl]);

console.log("等待浏览器授权…");
const { accessToken, refreshToken } = await pollCursorAuth(uuid, verifier);

let store: Record<string, unknown> = {};
try {
  store = JSON.parse(await Bun.file(AUTH_PATH).text());
} catch {
  // 文件不存在或为空，从头建
}
store.cursor = {
  type: "oauth",
  refresh: refreshToken,
  access: accessToken,
  expires: getTokenExpiry(accessToken),
};
await Bun.write(AUTH_PATH, JSON.stringify(store, null, 2));
console.log(`登录成功，凭证已写入 ${AUTH_PATH}`);
