import { readFileSync, writeFileSync } from 'node:fs';

const API_URL = 'https://murasame-5c56a-default-rtdb.firebaseio.com/bot_stats.json';
const MARKER_RE = /<!-- BOT_STATS:START -->[\s\S]*?<!-- BOT_STATS:END -->/;


function formatCompact(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function nowString() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second} (UTC+8)`;
}

function buildBlock({ guilds, users, commands, version, banUsers, banServers, updated, lang }) {
  if (lang === 'en') {
    return `| Servers: ${guilds} | Users: ${users} | Commands: ${commands} |
|:---:|:---:|:---:|
| Version: ${version} | Banned Users: ${banUsers} | Banned Servers: ${banServers} |


<sub>Last updated: ${updated}</sub>`;
  }
  return `| 伺服器：${guilds} | 使用者：${users} | 指令次數：${commands} |
|:---:|:---:|:---:|
| 版本：${version} | 停權用戶：${banUsers} | 停權社群：${banServers} |


<sub>最後更新時間：${updated}</sub>`;
}

function updateFile(path, block) {
  const content = readFileSync(path, 'utf8');
  if (!MARKER_RE.test(content)) {
    throw new Error(`在 ${path} 找不到 <!-- BOT_STATS:START/END --> 標記區塊，請確認 README 是否已插入標記。`);
  }
  const next = content.replace(MARKER_RE, `<!-- BOT_STATS:START -->\n${block}\n<!-- BOT_STATS:END -->`);
  writeFileSync(path, next, 'utf8');
}

async function main() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`API 請求失敗，狀態碼：${res.status}`);
  }
  const data = await res.json();

  const guilds = formatCompact(data.guilds);
  const users = formatCompact(data.user_total);
  const commands = formatCompact(data.command);
  const version = data.version;
  const banUsers = data.ban_users; // 直接顯示原始數字，不做 k/M 縮寫
  const banServers = data.ban_servers;
  const updated = nowString();

  updateFile(
    'README.md',
    buildBlock({ guilds, users, commands, version, banUsers, banServers, updated, lang: 'zh' })
  );
  updateFile(
    'README.en.md',
    buildBlock({ guilds, users, commands, version, banUsers, banServers, updated, lang: 'en' })
  );

  console.log('README 數據更新完成:', { guilds, users, commands, version, banUsers, banServers, updated });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
