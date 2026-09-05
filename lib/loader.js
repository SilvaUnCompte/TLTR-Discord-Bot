/**
 * Filesystem loaders for commands and events.
 *
 * Adding a command means dropping a file in commands/; adding an event means
 * dropping a file in events/. Nothing else has to be edited. See EVOLUTION.md.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function listModules(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs
        .readdirSync(directory)
        .filter((file) => file.endsWith('.js'))
        .map((file) => path.resolve(directory, file));
}

/**
 * @param {string} directory Folder holding one module per command.
 * @returns {Array<{ data: object, execute: Function, cooldown?: object }>}
 */
function loadCommands(directory) {
    const commands = [];

    for (const file of listModules(directory)) {
        const command = require(file);

        if (!command?.data || typeof command.execute !== 'function') {
            logger.warn(`⚠️ Skipping ${path.basename(file)}: missing "data" or "execute" export`);
            continue;
        }
        commands.push(command);
    }

    return commands.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

/**
 * Registers every event module on the client.
 *
 * A module exports either one `{ name, execute, once? }` handler or an array of
 * them, which keeps several small related listeners in a single file.
 * @param {import('discord.js').Client} client
 * @param {string} directory Folder holding the event modules.
 * @returns {number} how many listeners were registered.
 */
function registerEvents(client, directory) {
    let count = 0;

    for (const file of listModules(directory)) {
        const exported = require(file);
        const handlers = Array.isArray(exported) ? exported : [exported];

        for (const handler of handlers) {
            if (!handler?.name || typeof handler.execute !== 'function') {
                logger.warn(
                    `⚠️ Skipping a handler in ${path.basename(file)}: missing "name" or "execute"`
                );
                continue;
            }

            const bind = handler.once ? client.once : client.on;
            bind.call(client, handler.name, (...args) => handler.execute(...args));
            count += 1;
        }
    }

    return count;
}

module.exports = { loadCommands, registerEvents };
