import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const WATCH = (process.env.STATION_CHANNEL_IDS || '')
  .split(',').map(s => s.trim()).filter(Boolean);
const CUSTOMER_WEBHOOK = process.env.CUSTOMER_WEBHOOK_URL;
const ACCENT = process.env.ACCENT_COLOR || '#1b7c53';

if (!TOKEN) { console.error('Missing DISCORD_TOKEN in .env'); process.exit(1); }
if (!CUSTOMER_WEBHOOK) { console.error('Missing CUSTOMER_WEBHOOK_URL in .env'); process.exit(1); }

function hexToInt(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  return isNaN(n) ? 1801811 : n;
}

// Does this message look like a "running late, need X more minutes" note?
// Returns the number of minutes, or null.
function parseDelayMinutes(text) {
  const t = (text || '').toLowerCase();
  if (!t.trim()) return null;

  const intent = /(delay|delayed|running late|held up|hold up|behind|taking longer|longer than|more time|bit late|a bit longer|need\s+(?:another|more|\d))/i.test(t);

  // grab a number sitting next to a minutes word: "5 more minutes", "another 10 min", "15 mins"
  const m = t.match(/(\d{1,3})\s*(?:more\s+|extra\s+|another\s+)?min(?:ute)?s?\b/);
  const minutes = m ? parseInt(m[1], 10) : null;

  // Only fire when there's a delay intent AND a minute count, or the very explicit
  // "X more minutes" phrasing on its own.
  const explicit = /(\d{1,3})\s*more\s*min(?:ute)?s?\b/.test(t);
  if ((intent && minutes) || (explicit && minutes)) return minutes;
  return null;
}

function apologyText(minutes) {
  const unit = minutes === 1 ? 'minute' : 'minutes';
  return `Kia ora! So sorry \u2014 things are taking a little longer than expected. `
    + `Your One NZ agent will be ready in about ${minutes} more ${unit}. `
    + `Thanks so much for your patience \u2014 we\u2019ll be right with you. \u{1F64F}`;
}

async function relayToCustomer(minutes) {
  const embed = {
    title: '\u{1F4F1} Text message',
    description: apologyText(minutes),
    color: hexToInt(ACCENT),
    footer: { text: 'One NZ \u00b7 simulated SMS' },
    timestamp: new Date().toISOString()
  };
  const res = await fetch(CUSTOMER_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'One NZ SMS', embeds: [embed] })
  });
  if (!res.ok) throw new Error(`Webhook POST failed: ${res.status}`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(WATCH.length ? `Watching channels: ${WATCH.join(', ')}` : 'Watching ALL visible channels');
});

client.on('messageCreate', async (msg) => {
  try {
    if (msg.author.bot || msg.webhookId) return;            // ignore bots + webhooks (no loops)
    if (WATCH.length && !WATCH.includes(msg.channelId)) return;

    const minutes = parseDelayMinutes(msg.content);
    if (minutes == null) return;

    await relayToCustomer(minutes);
    await msg.react('\u2705').catch(() => {});               // tick = customer notified
    console.log(`Relayed +${minutes}min from #${msg.channel?.name || msg.channelId}`);
  } catch (e) {
    console.error('Relay error:', e.message);
    await msg.react('\u26A0\uFE0F').catch(() => {});          // warn = failed
  }
});

client.login(TOKEN);
