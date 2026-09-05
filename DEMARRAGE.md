# TLTR Bot — exploitation

Le bot est supervisé par **PM2**.

- Dossier : `~/bots/TLTR-Discord-Bot`
- Nom du process PM2 : `tltr-bot`
- Config PM2 : `ecosystem.config.js`
- Logs PM2 : `~/.pm2/logs/tltr-bot-out.log` et `tltr-bot-error.log`

---

## Mise à jour du code

```bash
cd ~/bots/TLTR-Discord-Bot
git pull
npm ci --omit=dev
pm2 restart tltr-bot
pm2 logs tltr-bot --lines 30
```

Trois cas où il faut faire un peu plus :

| Situation | Commande en plus |
|---|---|
| Les slash commands ont changé (`commands/`, `command-list.js`) | `npm run deploy-commands` **avant** le restart |
| Le `.env` a changé | `pm2 restart tltr-bot --update-env` au lieu du restart simple |
| `ecosystem.config.js` a changé | `pm2 reload ecosystem.config.js --update-env` puis `pm2 save` |

Après le restart, vérifie que tu vois `✅ Ready! Logged in as ...` dans les logs et que `pm2 list` affiche `online` avec `↺ 0`.

---

## Commandes courantes

```bash
pm2 list                        # état + nombre de restarts (colonne ↺)
pm2 logs tltr-bot --lines 100   # logs en direct
pm2 logs tltr-bot --err         # erreurs uniquement
pm2 restart tltr-bot
pm2 stop tltr-bot
pm2 monit                       # dashboard temps réel
pm2 flush tltr-bot              # vider ses logs
```

---

## Si ça ne repart pas

```bash
pm2 describe tltr-bot                     # exit code, unstable restarts
tail -n 100 ~/.pm2/logs/tltr-bot-error.log
```

| Symptôme | Cause probable |
|---|---|
| `↺` qui grimpe, statut `errored` | Crash en boucle → lire `tltr-bot-error.log` |
| `Cannot find module` | `npm ci --omit=dev` oublié après le `git pull` |
| `DISCORD_TOKEN is required` | `.env` absent ou illisible |
| Slash commands absentes sur Discord | `npm run deploy-commands` oublié (jusqu'à 1 h de propagation en global) |
| `permission denied ... rpc.sock` | Un `sudo pm2` a repris le dossier → `sudo chown -R silvathor:silvathor ~/.pm2` |

Repartir de zéro sans casser le reste :

```bash
pm2 delete tltr-bot
cd ~/bots/TLTR-Discord-Bot
pm2 start ecosystem.config.js
pm2 save
```

---

## Après un reboot du VPS

Rien à faire, le service systemd relance PM2. Pour vérifier :

```bash
systemctl status pm2-silvathor    # doit être enabled + active
pm2 list
```

**Important** : après tout `pm2 start`, `pm2 delete` ou changement de config, fais un `pm2 save`. Sans ça, l'état ne sera pas restauré au prochain reboot.
