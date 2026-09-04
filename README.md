# One NZ delay relay bot

Watches the three **station** channels. When a staff member posts something like
"there's been a delay, need 5 more minutes", the bot parses the number of minutes and
posts an apology to the **customer** channel:

> Kia ora! So sorry — things are taking a little longer than expected. Your One NZ agent
> will be ready in about 5 more minutes. Thanks so much for your patience 🙏

It reacts ✅ on the staff message once the customer has been notified (⚠️ if it failed).

## What it catches
Fires when a message has a delay cue **and** a minute count, e.g.
- "delay, need 5 more minutes"
- "running late — another 10 min"
- "held up, 15 mins behind"
- "…it'll be 20 more minutes" (the explicit "X more minutes" phrasing fires on its own)

It ignores messages from bots and webhooks, so the app's own posts never trigger it.

## Setup (one time, ~3 min)
1. Go to https://discord.com/developers/applications → **New Application**.
2. **Bot** tab → **Reset Token** → copy the token.
3. Under **Privileged Gateway Intents**, turn ON **Message Content Intent**. Save.
4. **OAuth2 → URL Generator**: scope `bot`, permissions **View Channels**, **Send Messages**,
   **Add Reactions**, **Read Message History**. Open the generated URL and add the bot to your server.
5. In Discord, enable Developer Mode (Settings → Advanced), right-click each **station** channel
   → **Copy Channel ID**.

## Configure
```
cd bot
cp .env.example .env
```
Fill in `.env`:
- `DISCORD_TOKEN` — from step 2
- `STATION_CHANNEL_IDS` — the three station channel IDs, comma-separated (or leave blank to watch all)
- `CUSTOMER_WEBHOOK_URL` — the customer channel's webhook (reuse the app's simulated-SMS webhook)

## Run locally
```
npm install
npm start
```

## Host it (always-on)
The bot must stay running to listen. Any always-on host works — e.g. Railway or Fly.io:
- **Railway**: New Project → Deploy from repo (or upload the `bot/` folder) → add the same
  variables from `.env` under Variables → it runs `npm start` automatically.
- Set the same three env vars in the host's dashboard; don't commit your real `.env`.
