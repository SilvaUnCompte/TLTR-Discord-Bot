#!/usr/bin/env node
/**
 * Starboard storage diagnostic.
 *
 * Usage on the server: cd ~/bots/TLTR-Discord-Bot && node tools/starboard-doctor.js
 * Prints ownership and permissions of the config folders, then tries a write.
 */
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '..', 'configs');
const STARBOARD_DIR = path.join(CONFIG_DIR, 'starboards');

function describe(target) {
    try {
        const stats = fs.statSync(target);
        return `mode=${(stats.mode & 0o777).toString(8)} uid=${stats.uid} gid=${stats.gid}`;
    } catch (error) {
        return `MISSING (${error.code})`;
    }
}

console.log('process uid/gid :', process.getuid?.(), process.getgid?.());
console.log('cwd             :', process.cwd());
console.log('configs/        :', CONFIG_DIR, '|', describe(CONFIG_DIR));
console.log('starboards/     :', STARBOARD_DIR, '|', describe(STARBOARD_DIR));

if (!fs.existsSync(STARBOARD_DIR)) {
    try {
        fs.mkdirSync(STARBOARD_DIR, { recursive: true });
        console.log('-> directory created');
    } catch (error) {
        console.log('-> FAILED to create:', error.code, error.message);
        process.exit(1);
    }
}

try {
    const probe = path.join(STARBOARD_DIR, '.doctor');
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    console.log('write test      : OK');
} catch (error) {
    console.log('write test      : FAILED ->', error.code, error.message);
    console.log(`  fix: sudo chown -R $USER "${CONFIG_DIR}" && chmod -R u+rwX "${CONFIG_DIR}"`);
}

for (const file of fs.readdirSync(STARBOARD_DIR).filter((name) => name.endsWith('.json'))) {
    const full = path.join(STARBOARD_DIR, file);
    let summary;
    try {
        summary = `${Object.keys(JSON.parse(fs.readFileSync(full, 'utf8'))).length} entry/entries`;
    } catch (error) {
        summary = `UNREADABLE (${error.message})`;
    }
    console.log(`  ${file} : ${summary} | ${describe(full)}`);
}
