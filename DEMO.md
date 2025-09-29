# Discord Bot Demo

This file shows what the bot responses look like when users interact with it.

## Example Interactions

### Echo Command
```
User: /echo message:Hello Discord Bot!
Bot:  You said: Hello Discord Bot!
```

### Ping Command
```
User: /ping
Bot:  Pinging...
      (updates to) 🏓 Pong! Latency is 45ms. API Latency is 89ms
```

### Say Command
```
User: /say text:Welcome to our awesome server! 🎉
Bot:  Welcome to our awesome server! 🎉
```

## Command Features

- **Echo Command**: Perfect for testing - the bot will repeat exactly what you type
- **Ping Command**: Shows both message latency and Discord API latency
- **Say Command**: Makes the bot speak custom text (with mention protection for security)

## Error Handling

If something goes wrong, users will see helpful error messages:
```
Bot: There was an error while executing this command!
     (This message is only visible to you)
```

The bot logs all command executions and errors to the console for debugging.