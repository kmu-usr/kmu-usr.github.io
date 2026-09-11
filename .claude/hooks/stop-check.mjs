// Stop hook（裁定 Q11-甲 (c)）：結束回合前檢查。
// 規則：網站修改一律在分支進行；main 上不得有未提交變更或未推送 commit；未提交變更先處理；推送須經使用者明示同意。
// 有問題 → decision=block 一次；stop_hook_active=true → 放行。永遠平台中立（僅 Node）。
import { execSync } from 'node:child_process';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..', '..');
const run = (c) => { try { return execSync(c, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return ((e.stdout || '') + (e.stderr || '')).toString().trim(); } };
let input = {};
try { input = JSON.parse(await new Promise((r) => { let d = ''; process.stdin.on('data', (c) => d += c); process.stdin.on('end', () => r(d || '{}')); process.stdin.resume(); })); } catch {}
if (input.stop_hook_active) process.exit(0);
const branch = run('git rev-parse --abbrev-ref HEAD');
const dirty = run('git -c core.quotepath=off status --porcelain --untracked-files=all').split('\n').filter(Boolean);
const ahead = Number(run('git rev-list --count origin/main..HEAD') || 0);
const lint = run('node scripts/check-redlines.mjs');
const lintFail = /失敗 [1-9]/.test(lint);
const problems = [];
if (branch === 'main' && (dirty.length || ahead)) problems.push(`在 main 上有變更（未提交 ${dirty.length}、未推送 ${ahead}）：網站修改一律先開分支（git switch -c <name>），不得直接動 main。`);
if (branch !== 'main' && dirty.length) problems.push(`分支 ${branch} 有 ${dirty.length} 個未提交變更，請 commit（僅本機，不推送）。`);
if (lintFail) problems.push('紅線 lint 未通過：\n' + lint);
if (!problems.length) process.exit(0);
process.stdout.write(JSON.stringify({ decision: 'block', reason: ['[stop-check] 結束前檢查未通過：', ...problems, '推送 main 一律須使用者明示同意（Q11-甲）。'].join('\n') }));
