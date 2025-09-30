# TLTR-Discord-Bot

Playground to learn building Discord bots using Discord.js v14 with modern slash commands.

[![Discord](https://img.shields.io/discord/123456789012345678?label=Join%20the%20Server&logo=discord&style=flat-square)](https://discord.gg/bSXzMrSyd5)
[![GitHub stars](https://img.shields.io/github/stars/SilvaUnCompte/TLTR-Discord-Bot?style=social)](https://github.com/SilvaUnCompte/TLTR-Discord-Bot)

## 🚀 Features

- ✅ **Modern Slash Command Support** - Full Discord v14 compatibility
- 🔄 **Echo Command** - Responds with user input for testing
- 🏓 **Ping Command** - Shows bot and API latency monitoring
- 💬 **Say Command** - Makes the bot send custom messages safely
- 📁 **Modular Architecture** - Organized command structure for scalability
- 📝 **Environment Configuration** - Easy setup with `.env` files
- 🔧 **Developer Tools** - Automated command deployment scripts

## 🎯 Available Commands

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/echo <message>` | Echoes back your message | `/echo Hello World!` → "You said: Hello World!" |
| `/ping` | Shows bot and API latency | `/ping` → "🏓 Pong! Latency is 45ms. API Latency is 67ms" |
| `/say <text>` | Makes the bot send a message | `/say Welcome!` → "Welcome!" |

## Setup Instructions

### Prerequisites

- Node.js 16.9.0 or higher
- A Discord application and bot token

### 1. Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section
4. Create a bot and copy the token
5. Copy the Application ID from the "General Information" section

### 2. Bot Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` file with your bot credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here  # Optional, for faster development
   ```

### 3. Invite Bot to Server

Create an invite link with these permissions:
- `applications.commands` scope
- `Send Messages` permission
- `Use Slash Commands` permission

URL format:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=2048&scope=bot%20applications.commands
```

### 4. Deploy Commands

Deploy slash commands to Discord:

```bash
# For development (faster, guild-specific)
npm run deploy-commands

# For production (global commands, takes up to 1 hour)
# Remove GUILD_ID from .env first, then run:
npm run deploy-commands
```

### 5. Start the Bot

```bash
npm start
```

## 💡 Usage Examples

Once the bot is running and commands are deployed, you can use these commands in any channel where the bot has permissions:

### 🔄 Echo Command
```
/echo message: Hello World!
```
**Bot Response:** `You said: Hello World!`

### 🏓 Ping Command
```
/ping
```
**Bot Response:** `🏓 Pong! Latency is 45ms. API Latency is 67ms`

### 💬 Say Command
```
/say text: Welcome to our awesome server!
```
**Bot Response:** `Welcome to our awesome server!`

> 🛡️ **Security Note:** The say command includes mention protection to prevent abuse

## Development

### 🔧 Adding New Commands

The bot uses a centralized command system for easy management:

1. **Add to `command-list.js`:**
   ```javascript
   {
       data: new SlashCommandBuilder()
           .setName('yourcommand')
           .setDescription('Your command description'),
       async execute(interaction) {
           await interaction.reply('Your response here!');
       }
   }
   ```

2. **Deploy the new command:**
   ```bash
   npm run deploy-commands
   ```

3. **Restart the bot:**
   ```bash
   npm start
   ```

**✨ That's it!** The bot automatically loads commands from `command-list.js`

### 📂 Project Structure

```
TLTR-Discord-Bot/
├── 📁 commands/          # Individual command modules (future expansion)
│   └── tltr.js            # Additional command definitions
├── 📄 index.js           # Main bot application & event handlers
├── 📄 command-list.js    # Centralized command definitions & logic
├── 📄 deploy-commands.js # Command deployment & registration script
├── 📄 package.json       # Dependencies, scripts & project metadata
├── 📄 .env               # Your bot credentials (not in git)
└── 📄 README.md          # Project documentation (this file)
```

### 🏗️ Architecture Overview

- **`index.js`** - Core bot logic, event handling, and command execution
- **`command-list.js`** - All commands with their data and execute functions
- **`deploy-commands.js`** - Automated script to register commands with Discord
- **`commands/`** - Folder for additional modular commands (extensibility)

## Security Notes

- Never commit your `.env` file or bot token
- The bot includes mention protection in the `say` command
- Error handling prevents crashes from invalid interactions

## 🐛 Troubleshooting

### ❌ Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| **"Invalid Token"** | ✅ Verify `DISCORD_TOKEN` in your `.env` file |
| **Commands not appearing** | ✅ Run `npm run deploy-commands`<br>✅ Use `GUILD_ID` for faster dev deployment<br>✅ Global commands take up to 1 hour |
| **Permission errors** | ✅ Check bot permissions in Discord server<br>✅ Ensure `applications.commands` scope is enabled |
| **Bot not responding** | ✅ Check console logs for errors<br>✅ Verify bot is online in Discord<br>✅ Restart with `npm start` |

### 🆘 Getting Help

If you encounter issues:
1. **Check Console Logs** - Look for error messages in your terminal
2. **Verify Configuration** - Double-check your `.env` file setup
3. **Test Permissions** - Ensure bot has proper Discord server permissions
4. **Update Dependencies** - Run `npm update` to get latest versions
5. **Still a problem?** Open an issue on GitHub, I may have missed something!

### 📋 Quick Debugging Checklist

- [ ] Bot token is correct in `.env`
- [ ] Client ID is set in `.env`
- [ ] Commands deployed with `npm run deploy-commands`
- [ ] Bot invited with `applications.commands` scope
- [ ] Bot has `Send Messages` and `Use Slash Commands` permissions

## 📜 License

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

### 🚫 **Usage Restrictions:**
- ❌ **No Commercial Use** - You cannot use this code for commercial purposes (or contact me)
- ✅ **Personal & Educational Use** - Free to use for non-commercial projects
- ✅ **Modifications Allowed** - You can modify and redistribute under same license
- ✅ **Attribution Required** - You must give appropriate credit

### 📄 **What This Means:**
- You can use this bot template for your Discord server
- You can modify and improve the code
- You must share modifications under the same license
- You cannot sell or monetize this code or derivative works

For the full license text, see the [LICENSE](LICENSE) file.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest new features  
- 🔧 Submit pull requests
- 📝 Improve documentation

## ⭐ Show Your Support

If this helped you, consider giving it a star on GitHub!

---

**Happy coding! 🚀** Built with ❤️ using Discord.js v14