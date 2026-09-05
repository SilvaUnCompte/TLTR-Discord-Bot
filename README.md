# TLTR-Discord-Bot

[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord&logoColor=white&style=flat-square)](https://discord.gg/bSXzMrSyd5)
[![GitHub stars](https://img.shields.io/github/stars/SilvaUnCompte/TLTR-Discord-Bot?style=social)](https://github.com/SilvaUnCompte/TLTR-Discord-Bot)
[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg?style=flat-square)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

A personal Discord bot built on discord.js v14: AI conversation summaries,
voice transcription, and a starboard.

## Commands

| Command                | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `/ping`                | Bot and gateway latency                                               |
| `/ask <question>`      | Answers a question with the channel as context                        |
| `/tltr [limit] [tone]` | Summarizes the recent conversation                                    |
| `/copilot`             | Joins your voice channel, transcribes and answers. Run again to leave |
| `/debuginfo`           | Error statistics, uptime and memory                                   |
| `/config`              | Guild settings (administrators only)                                  |

`/ask` is limited to one use per user every 30 seconds, `/tltr` to one use per
channel every 3 minutes.

## Features

- Slash commands, loaded from `commands/` with no central registry to edit.
- AI answers and summaries through the Groq API.
- Voice transcription through Google Speech-to-Text; the bot leaves on its own
  when the channel empties or after a period of silence.
- Starboard: messages reaching a configurable number of stars are mirrored to a
  channel, kept in sync, and removed when the stars go away.
- Automatic splitting of replies longer than Discord's 2000-character limit.
- Dated error logs under `logs/`, with retention and rotation.

## Requirements

- Node.js 20 or newer
- A Discord application with the **Message Content** privileged intent enabled
- A Groq API key
- A Google Cloud service account with the Speech-to-Text API enabled
  (voice features only)

## Setup

```bash
git clone https://github.com/SilvaUnCompte/TLTR-Discord-Bot.git
cd TLTR-Discord-Bot
npm install
cp .env.example .env    # then fill it in
npm run deploy-commands
npm start
```

Every setting lives in `.env`; `.env.example` documents each one. Save the
Google service account JSON as `google-credentials.json` at the project root,
or point `GOOGLE_APPLICATION_CREDENTIALS` somewhere else.

Invite the bot with the `bot` and `applications.commands` scopes, and the
permissions: Send Messages, Read Message History, Add Reactions, Embed Links,
Connect, Speak.

## Configuration in Discord

```
/config view                          Show the current settings
/config list                          List every available setting
/config starboard-channel #channel    Choose the starboard channel
/config starboard-threshold 3         Stars required before mirroring
/config reset                         Back to defaults
```

Settings are stored per guild in `configs/guilds.json`, which is created on
first use and is not tracked by git.

## Project layout

```
API/         External services (Groq, Google Speech-to-Text)
commands/    One file per slash command
events/      One file per Discord gateway event
features/    Multi-file features (starboard, voice copilot)
lib/         Shared building blocks (logger, env, storage, cooldowns, loader)
utils/       Helpers (message splitting, error handling, audio, config)
tools/       Maintenance scripts
```

## Development

```bash
npm run lint          # ESLint
npm run format        # Prettier
npm run check:style   # English-only and emoji rules
npm run check         # all three
npm run doctor        # diagnose the starboard storage
```

Adding a command, an event or a feature is described in [EVOLUTION.md](EVOLUTION.md).
Running the bot in production is described in [DEMARRAGE.md](DEMARRAGE.md).

## Conventions

- Code, comments and documentation are written in English.
- Emoji are allowed only where a human reads them at runtime: inside a Discord
  message or a console log. `npm run check:style` enforces this.
- Four-space indentation, single quotes, 100-column lines (Prettier).

## Security notes

- Never commit `.env` or `google-credentials.json`.
- Messages taken from a channel are sent to the AI as delimited data, never as
  instructions, so a member cannot rewrite the bot's prompt.
- `/ask` only ever describes channels that the `@everyone` role can see.
- Voice audio is processed in memory and never written to disk, but every
  transcript is posted publicly in the text channel the command was run from.

## License

[CC BY-NC-SA 4.0](LICENSE). Non-commercial use, attribution required, and
derivative works must keep the same license.
