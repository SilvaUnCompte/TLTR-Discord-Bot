/**
 * Diagnostic du stockage starboard.
 * Usage (sur le serveur) : cd ~/bots/TLTR-Discord-Bot && node tools/starboard-doctor.js
 */
const fs = require("fs");
const path = require("path");

const CONFIG_DIR = path.join(__dirname, "..", "configs");
const DIR = path.join(CONFIG_DIR, "starboards");

function describe(p) {
    try {
        const st = fs.statSync(p);
        return `mode=${(st.mode & 0o777).toString(8)} uid=${st.uid} gid=${st.gid}`;
    } catch (e) {
        return `ABSENT (${e.code})`;
    }
}

console.log("process uid/gid :", process.getuid?.(), process.getgid?.());
console.log("cwd             :", process.cwd());
console.log("configs/        :", CONFIG_DIR, "|", describe(CONFIG_DIR));
console.log("starboards/     :", DIR, "|", describe(DIR));

if (!fs.existsSync(DIR)) {
    try {
        fs.mkdirSync(DIR, { recursive: true });
        console.log("→ dossier créé");
    } catch (e) {
        console.log("→ ÉCHEC création :", e.code, e.message);
        process.exit(1);
    }
}

try {
    const probe = path.join(DIR, ".doctor");
    fs.writeFileSync(probe, "ok");
    try { fs.unlinkSync(probe); } catch (_) { }
    console.log("écriture        : OK");
} catch (e) {
    console.log("écriture        : ÉCHEC ->", e.code, e.message);
    console.log("  fix : sudo chown -R $USER", CONFIG_DIR, "&& chmod -R u+rwX", CONFIG_DIR);
}

for (const f of fs.readdirSync(DIR).filter(n => n.endsWith(".json"))) {
    const full = path.join(DIR, f);
    let info = "";
    try {
        const data = JSON.parse(fs.readFileSync(full, "utf8"));
        info = `${Object.keys(data).length} entrée(s)`;
    } catch (e) {
        info = `ILLISIBLE (${e.message})`;
    }
    console.log(`  ${f} : ${info} | ${describe(full)}`);
}
