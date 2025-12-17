# TLTR-Discord-Bot

[![Discord](https://img.shields.io/discord/123456789012345678?label=Join%20the%20Server&logo=discord&style=flat-square)](https://discord.gg/bSXzMrSyd5)
[![GitHub stars](https://img.shields.io/github/stars/SilvaUnCompte/TLTR-Discord-Bot?style=social)](https://github.com/SilvaUnCompte/TLTR-Discord-Bot)

## 🚀 Features

- ✅ **Slash Command Support** - Full Discord v14 compatibility
- 🤖 **AI-Powered Q&A** - Ask questions and get LLM responses
- 🤖 **AI-Powered Conversation Summarization** - TLTR with AI integration
- 🎤 **Voice Channel Integration** - Real-time voice recording and speech-to-text
- 📝 **Environment Configuration** - Easy setup with `.env` files
- 🔧 **Developer Tools** - Automated command deployment scripts
- 🔒 **Message Splitting** - Automatic handling of Discord's 2000-character limit
- 🛡️ **Audio Security** - Filtering to prevent false voice triggers
- 🔍 **Debug & Monitoring** - Error logging and system monitoring

## 🎯 Available Commands

| Command | Description | Usage Example |
|---------|-------------|---------------|
| `/ping` | Shows bot and API latency | `/ping` → "🏓 Pong! Latency is 45ms. API Latency is 67ms" |
| `/ask <question>` | 🤖 Ask the AI bot any question | `/ask What is the weather like?` → AI responds to your question |
| `/tltr [messages]` | 🤖 AI-powered conversation summarization | `/tltr 50` → Summarizes last 50 messages with AI |
| `/copilot` | 🎤 Join voice channel and start voice recording | `/copilot` → Bot joins your voice channel and listens |
| `/debuginfo` | 🔧 Show bot error statistics and debug information | `/debuginfo` → Displays error logs, memory usage, and bot status |

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

#### Required Privileged Gateway Intents

**IMPORTANT:** You must enable the following **Privileged Gateway Intents** in the Discord Developer Portal:

1. Navigate to **Bot** -> **Privileged Gateway Intents**
2. Enable these intents:
   - **Message Content Intent** - Required for message reactions and content access
   - **Server Members Intent** - Optional, but recommended for full reaction functionality

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
   # Discord Configuration
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here  # Optional, for faster development
   ```

5. **Set up Google Speech-to-Text** (for voice features):
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable the Speech-to-Text API
   - Create a service account and download the JSON credentials
   - Save as `google-credentials.json` in the project root

6. **Get Groq API Key** (for LLM features):
   - Visit [Groq Console](https://console.groq.com/)
   - Create an account and generate an API key
   - Add it to your `.env` file

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

### 🏓 Ping Command
```
/ping
```
**Bot Response:** `🏓 Pong! Latency is 45ms. API Latency is 67ms`

### 🤖 Ask Command
```
/ask What is the capital of France?
```
**Bot Response:** AI-powered answer to your question using LLM

### 🤖 AI Conversation Summarization
```
/tltr 25
```
**Bot Response:** AI summary of the last 25 messages with key points and context

### 🎤 Voice Channel Integration
```
/copilot
```
**Bot Actions:**
1. Joins your current voice channel
2. Starts listening for speech
3. Transcribes what you say
4. Processes speech with AI for intelligent responses

> 🛡️ **Security Notes:** 
> - Voice recording includes noise filtering and speech detection

### 🔧 Debug Information
```
/debuginfo
```
**Bot Response:** Shows comprehensive debug information including:
- Error statistics and log file counts
- Bot status (uptime, memory usage, Node.js version)
- Error types breakdown
- System health information

> 🔒 **Note:** This command is typically used by administrators for monitoring bot health

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

3. **Start the bot:**
   ```bash
   pm2 start index.js
   ```

**✨ That's it!** The bot automatically loads commands from `command-list.js`

### 📂 Project Structure

```
TLTR-Discord-Bot/
├── 📁 API/                      # External API integrations
│   ├── groq.js                  # Groq AI API integration
│   └── STT.js                   # Google Speech-to-Text API
├── 📁 commands/                 # Individual command modules
│   ├── ask.js                   # AI-powered question & answer
│   ├── debuginfo.js             # System debug information and error statistics
│   ├── tltr.js                  # AI-powered conversation summarization
│   └── vocal-copilot.js         # Voice channel integration
├── 📁 utils/                    # Utility modules
│   ├── audioAnalyzer.js         # Audio processing and validation
│   ├── errorHandler.js          # Comprehensive error logging and crash prevention
│   ├── googleAuth.js            # Google authentication handling
│   └── messageHandler.js        # Discord message splitting utilities
├── 📄 index.js                  # Main bot application & event handlers
├── 📄 command-list.js          # Centralized command definitions & logic
├── 📄 deploy-commands.js       # Command deployment & registration script
├── 📄 package.json             # Dependencies, scripts & project metadata
├── 📄 .env                     # Your bot credentials (not in git)
├── 📄 google-credentials.json  # Google Cloud service account (not in git)
└── 📄 README.md                # Project documentation (this file)
```

### 🏗️ Architecture Overview

- **`index.js`** - Core bot logic, event handling, and command execution
- **`command-list.js`** - All commands with their data and execute functions
- **`deploy-commands.js`** - Automated script to register commands with Discord
- **`commands/`** - Modular command implementations
  - **`ask.js`** - AI-powered question & answer functionality
  - **`debuginfo.js`** - System monitoring and error statistics display
  - **`tltr.js`** - AI conversation summarization
  - **`vocal-copilot.js`** - Voice channel integration with real-time STT
- **`API/`** - External service integrations
  - **`groq.js`** - Groq AI API client with message formatting
  - **`STT.js`** - Google Speech-to-Text integration
- **`utils/`** - Reusable utility modules
  - **`messageHandler.js`** - Smart Discord message splitting for long content
  - **`audioAnalyzer.js`** - Advanced audio processing and validation
  - **`errorHandler.js`** - Comprehensive error logging and crash prevention
  - **`googleAuth.js`** - Google Cloud authentication management

## 🔍 Error Handling & Monitoring

The bot includes error handling system that prevents crashes and provides comprehensive logging:

### 📊 **Features:**
- **Automatic Error Logging** - All errors are logged to `logs/` directory
- **Crash Prevention** - Bot continues running even when commands fail
- **User-Friendly Messages** - Clear error messages in English for users
- **Debug Command** - `/debuginfo` shows system health and error statistics
- **Configurable Logging** - Adjust log levels and retention via `.env` settings

### ⚙️ **Configuration Options:**
```bash
# Error handling settings in .env
MAX_LOG_DAYS=30              # Log retention period
LOG_LEVEL=ERROR              # Minimum severity to log
LOG_DISCORD_WARNINGS=false   # Log Discord API warnings
LOG_DISCORD_DEBUG=false      # Log Discord debug events
MAX_LOG_FILE_SIZE=10         # Max file size in MB
```

### 📁 **Log Structure:**
- `logs/error-YYYY-MM-DD.log` - Application errors
- `logs/critical-YYYY-MM-DD.log` - Critical system issues
- `logs/groq_api_error-YYYY-MM-DD.log` - AI API errors
- Automatic cleanup after configured retention period

## Security Notes

- Never commit your `.env` file or bot token
- The bot includes mention protection in the `say` command
- Error handling prevents crashes from invalid interactions
- Voice data is processed in real-time and never permanently stored
- Google Speech-to-Text uses secure OAuth2 authentication

## 🐛 Troubleshooting

### ❌ Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| **"Invalid Token"** | ✅ Verify `DISCORD_TOKEN` in your `.env` file |
| **Commands not appearing** | ✅ Run `npm run deploy-commands`<br>✅ Use `GUILD_ID` for faster dev deployment<br>✅ Global commands take up to 1 hour |
| **Permission errors** | ✅ Check bot permissions in Discord server<br>✅ Ensure `applications.commands` scope is enabled |
| **Bot not responding** | ✅ Check console logs for errors<br>✅ Verify bot is online in Discord<br>✅ Restart with `npm start` |
| **AI/TLTR not working** | ✅ Verify `GROQ_API_KEY` is set correctly<br>✅ Check Groq API quota and billing<br>✅ Ensure network connectivity |
| **Voice recording fails** | ✅ Check `google-credentials.json` exists<br>✅ Verify Google Speech-to-Text API is enabled<br>✅ Ensure bot has voice channel permissions |
| **"Cannot find module" errors** | ✅ Run `npm install` to install dependencies<br>✅ Check for Node.js version compatibility (16.9.0+)<br>✅ Delete `node_modules` and reinstall if needed |
| **Audio not being detected** | ✅ Adjust `MIN_VOLUME_THRESHOLD` in `.env`<br>✅ Lower `MIN_SPEECH_DURATION` for shorter speech<br>✅ Check microphone settings and Discord voice activity |

### 🆘 Getting Help

If you encounter issues:
1. **Check Console Logs** - Look for error messages in your terminal
2. **Verify Configuration** - Double-check your `.env` file setup
3. **Test Permissions** - Ensure bot has proper Discord server permissions
4. **Update Dependencies** - Run `npm update` to get latest versions
5. **Still a problem?** Open an issue on GitHub, I may have missed something!

### 📋 Quick Debugging Checklist

**Basic Setup:**
- [ ] Bot token is correct in `.env`
- [ ] Client ID is set in `.env`
- [ ] Commands deployed with `npm run deploy-commands`
- [ ] Bot invited with `applications.commands` scope
- [ ] Bot has `Send Messages` and `Use Slash Commands` permissions

**LLM Features:**
- [ ] `GROQ_API_KEY` is set in `.env`
- [ ] Groq API account has available quota
- [ ] Network allows connections to Groq API

**Voice Features:**
- [ ] `google-credentials.json` exists in project root
- [ ] Google Speech-to-Text API is enabled
- [ ] Service account has proper permissions
- [ ] `GOOGLE_APPLICATION_CREDENTIALS` path is correct
- [ ] Bot has `Connect` and `Speak` voice permissions
- [ ] Audio security settings are properly configured

## 📜 License

**Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International (CC BY-NC-SA 4.0)**

[![License: CC BY-NC-SA 4.0](https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc-sa/4.0/)

### **Usage Restrictions:**
- ❌ **No Commercial Use** - You cannot use this code for commercial purposes (or contact me)
- ✅ **Personal & Educational Use** - Free to use for non-commercial projects
- ✅ **Modifications Allowed** - You can modify and redistribute under same license
- ✅ **Attribution Required** - You must give appropriate credit

### **What This Means:**
- You can use this bot template for your Discord server
- You can modify and improve the code
- You must share modifications under the same license
- You cannot sell or monetize this code or derivative works

For the full license text, see the [LICENSE](LICENSE) file.

## Contributing

Contributions are welcome! Feel free to:
- 🐛 Report bugs
- 💡 Suggest new features  
- 🔧 Submit pull requests
- 📝 Improve documentation

## ⭐ Show Your Support

If this helped you, consider giving it a star on GitHub!

---

**Happy coding!** Built with ❤️ using Discord.js v14
