# TLTD-Discord-Bot

A Discord bot template with slash commands that can echo and respond to user input.

## Features

- ✅ Slash command support
- 🔄 Echo command - responds with user input
- 🏓 Ping command - shows bot latency
- 💬 Say command - makes the bot say custom text
- 🛡️ Error handling and security features
- 📝 Easy configuration with environment variables

## Commands

- `/echo <message>` - The bot will reply with "You said: [your message]"
- `/ping` - Shows bot and API latency
- `/say <text>` - Makes the bot say the specified text

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

## Usage Examples

Once the bot is running and commands are deployed:

1. **Echo Command**: 
   - Type `/echo Hello World!`
   - Bot responds: "You said: Hello World!"

2. **Ping Command**:
   - Type `/ping`
   - Bot responds with latency information

3. **Say Command**:
   - Type `/say Welcome to our server!`
   - Bot responds: "Welcome to our server!"

## Development

### Adding New Commands

1. Add the command definition to both `index.js` and `deploy-commands.js`
2. Redeploy commands: `npm run deploy-commands`
3. Restart the bot: `npm start`

### File Structure

```
├── index.js           # Main bot file
├── deploy-commands.js # Command deployment script
├── package.json       # Dependencies and scripts
├── .env.example      # Environment template
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## Security Notes

- Never commit your `.env` file or bot token
- The bot includes mention protection in the `say` command
- Error handling prevents crashes from invalid interactions

## Troubleshooting

### Common Issues

1. **"Invalid Token"**: Check your `DISCORD_TOKEN` in `.env`
2. **Commands not appearing**: 
   - Make sure commands are deployed with `npm run deploy-commands`
   - Global commands take up to 1 hour to appear
   - Try using `GUILD_ID` for faster development
3. **Permission errors**: Ensure bot has proper permissions in your server

### Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify your `.env` configuration
3. Ensure your bot has the necessary permissions

## License

MIT License - feel free to use this template for your own Discord bots!