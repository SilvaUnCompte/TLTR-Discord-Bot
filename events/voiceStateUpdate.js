const { Events } = require('discord.js');
const { handleVoiceStateUpdate } = require('../features/voice/copilotSession');

module.exports = {
    name: Events.VoiceStateUpdate,
    execute: (oldState, newState) => handleVoiceStateUpdate(oldState, newState),
};
