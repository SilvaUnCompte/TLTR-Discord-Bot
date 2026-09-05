# Démarrage propre du bot TLTR (VPS Debian + PM2)

## 1. Le diagnostic

```
┌────┬────────────────────┬──────────┬──────┬───────────┐
│ 0  │ voucher-bot        │ fork     │ 2    │ online    │
└────┴────────────────────┴──────────┴──────┴───────────┘
```

**Le bot TLTR n'est pas dans PM2.** La seule application supervisée est `voucher-bot` (Python, Clash of Clans), en ligne depuis 42 jours avec 2 restarts et 0 restart instable.

Autrement dit : PM2 fonctionne parfaitement sur ce VPS, il ne surveille simplement **pas** ce bot-là. Il tourne à la main — lancé dans un shell SSH, un `screen`/`tmux`, ou un `node index.js &`. Il meurt donc :

- à la fermeture de ta session SSH (systemd tue les process de la session) ;
- à la première `uncaughtException` — `utils/errorHandler.js` fait `process.exit(1)`, et personne ne le relance ;
- à chaque reboot du VPS.

Et rien n'est loggé côté PM2 puisque PM2 ne le connaît pas. C'est cohérent avec « pas de log marquante ».

> Un seul daemon PM2 tourne sur la machine (`PM2 v6.0.14: God Daemon (/home/debian/.pm2)`, utilisateur `debian`) : le bot n'est donc pas non plus supervisé sous un autre compte.

---

## 2. Rappel : accéder à PM2

PM2 tourne sous l'utilisateur `debian` (`PM2_HOME=/home/debian/.pm2`). Toi tu es `silvathor`, ton `~/.pm2` est un store distinct et vide — d'où le « permission denied » sur `rpc.sock`.

```bash
sudo -u debian -H pm2 list
```

Le `-H` est **obligatoire** : il force `HOME=/home/debian`. Sans lui, PM2 démarre un second daemon vide et affiche une liste vide sans erreur.

Alias à ajouter dans ton `~/.bashrc` :

```bash
alias bpm2='sudo -u debian -H pm2'
```

Les logs de toutes les apps sont dans `/home/debian/.pm2/logs/`, **pas** dans le dossier `logs/` du projet.

---

## 3. Localiser l'installation actuelle

Avant de mettre sous PM2, retrouve où le bot tourne et d'où :

```bash
# Le process actuel, s'il tourne encore
ps -eo user,pid,etime,cmd | grep -E "node|index\.js" | grep -v grep

# Le dossier du projet sur le VPS
sudo find /home -maxdepth 5 -type d -name "*TLTR*" 2>/dev/null

# Un screen/tmux oublié ?
sudo -u debian -H screen -ls 2>/dev/null; sudo -u debian -H tmux ls 2>/dev/null
```

Note le chemin exact et l'utilisateur : ce sont eux qui servent aux étapes suivantes.

---

## 4. Mise sous PM2

À faire avec l'utilisateur qui possède PM2 (`debian`), pour que le bot rejoigne le même store que `voucher-bot`.

```bash
sudo -u debian -H bash
cd /chemin/vers/TLTR-Discord-Bot     # celui trouvé au §3
```

### a) Arrêter l'instance manuelle

```bash
pkill -f "node.*index.js"    # vérifie d'abord avec le ps du §3 !
```

### b) Préparer

```bash
git pull                     # récupère ecosystem.config.js
npm ci --omit=dev
ls -l .env                   # doit exister et être lisible par debian
ls -l google-credentials.json   # si le vocal/STT est utilisé
```

Si les fichiers appartiennent encore à `silvathor` :

```bash
sudo chown debian:debian .env google-credentials.json
sudo chmod 600 .env
```

### c) Démarrer

```bash
npm run deploy-commands          # seulement si les slash commands ont changé
pm2 start ecosystem.config.js
pm2 save                         # <-- fige l'état, sinon rien ne revient au boot
```

### d) Vérifier

```bash
pm2 list                         # tltr-bot doit être "online", ↺ à 0
pm2 logs tltr-bot --lines 50     # doit afficher "✅ Ready! Logged in as ..."
```

Laisse tourner 10 minutes puis refais `pm2 list` : si `↺` grimpe, le bot crashe en boucle → `pm2 logs tltr-bot --err`.

---

## 5. Survivre au reboot

Le daemon tourne depuis 58 jours, donc le VPS n'a pas redémarré : rien ne prouve que la résurrection est configurée. À vérifier maintenant, avant le prochain reboot.

```bash
systemctl status pm2-debian
```

- **`active (running)` + `enabled`** → c'est bon, un `pm2 save` suffit.
- **`Unit pm2-debian.service could not be found`** → à configurer :

```bash
sudo -u debian -H pm2 startup systemd
# copie-colle la commande sudo affichée, puis :
sudo -u debian -H pm2 save
```

Test réel : `sudo reboot`, puis au retour `sudo -u debian -H pm2 list`. Les deux bots doivent être là.

---

## 6. Ce que corrige `ecosystem.config.js`

| Réglage | Défaut PM2 | Ici | Pourquoi |
|---|---|---|---|
| `max_restarts` | 15 | 50 | PM2 passe en `errored` et abandonne définitivement après 15 crashes rapides |
| `min_uptime` | 1000 ms | 30 s | un crash après 20 s doit compter comme instable |
| `restart_delay` | 0 | 5 s | laisser respirer entre deux tentatives |
| `exp_backoff_restart_delay` | — | 1 s | délai croissant en cas de crash en boucle |
| `max_memory_restart` | — | 600 M | garde-fou OOM sur les buffers audio du vocal |
| `time` | false | true | horodatage de chaque ligne de log |

Sans ça, `pm2 start index.js` tout court te ramène aux défauts — et donc au risque de voir PM2 lâcher l'affaire au bout de 15 crashes.

---

## 7. Commandes courantes

```bash
bpm2 list                                  # état + colonne ↺
bpm2 describe tltr-bot                     # uptime, exit code, unstable restarts
bpm2 logs tltr-bot --lines 200
bpm2 logs tltr-bot --err                   # erreurs uniquement
bpm2 monit                                 # dashboard temps réel
bpm2 restart tltr-bot
bpm2 reload ecosystem.config.js --update-env   # après modif du .env
bpm2 flush tltr-bot                        # vider ses logs
```

### Si ça retombe

```bash
bpm2 describe tltr-bot                          # exit code + unstable restarts
sudo tail -n 200 /home/debian/.pm2/logs/tltr-bot-error.log
sudo tail -n 100 /home/debian/.pm2/pm2.log      # décisions du daemon
sudo dmesg -T | grep -i "killed process"        # OOM killer
free -h
```

---

## 8. Mise à jour du code

```bash
sudo -u debian -H bash
cd /chemin/vers/TLTR-Discord-Bot
git pull
npm ci --omit=dev
npm run deploy-commands        # seulement si les commandes ont changé
pm2 restart tltr-bot
pm2 save
```

---

## 9. Fragilités du code à corriger

Une fois sous PM2, il redémarrera tout seul — mais autant supprimer les causes de crash :

- **`vocal-copilot.js`, catch de `startCopilot`** : le `catch` référence `connection`, déclaré en `let` **à l'intérieur** du `try` → `ReferenceError` si l'erreur survient avant sa création. Déclarer `let connection;` avant le `try`.
- **`vocal-copilot.js`** : `audioChunks` grossit sans limite pendant l'enregistrement. Principal candidat OOM sur un VPS. Ajouter un plafond de durée et/ou de taille.
- **`errorHandler.js`** : `handleUncaughtException` fait `process.exit(1)`. C'est le bon comportement *avec* un superviseur — mais sans PM2, c'est exactement ce qui éteint le bot définitivement.
- **`index.js` : pas de `partials`.** Les réactions ⭐ sur des messages non mis en cache ne déclenchent jamais l'événement (bug fonctionnel, pas un crash) :
  ```js
  const { Partials } = require('discord.js');
  // dans new Client({ ... })
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
  ```
