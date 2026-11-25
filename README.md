# Discord DND Plugin (Vencord)

A [Vencord](https://github.com/Vendicated/Vencord) user plugin (`DndFocus`) that turns Discord's **Do Not Disturb** status into a focus mode, plus a one-click **Streamer Mode** button.

## How it works

### Focus mode (when your status is Do Not Disturb)

- **Everything is hidden except what you allow.** Servers, folders, DMs and group DMs disappear from the server list and the DM list unless you put them on your allow list.
- **No sneaking back in.** If you open a server or DM that isn't allowed, you're sent back to the home page.
- **Lock screen.** The Friends page is replaced by a "LOCK TF IN" screen with a random cat picture. Click the picture to get another one.
- **Less noise.** The Friends button turns into a Home button. The pending friend request badge, the Nitro, Shop and Quests buttons, the "NEW" unread bars and the unread DM bubbles from people who aren't allowed are all hidden.
- Switch your status off Do Not Disturb and everything comes back.

**Choosing what stays visible**

- Right click a user, server or group DM, then pick **Show in Do Not Disturb**.
- Or open the plugin settings. There's a picker with **Servers**, **People** and **Groups** tabs, a search box and a switch for each entry.

### Streamer Mode button

- A round eye button sits at the top of the server list. Click it to turn Discord's Streamer Mode on or off.
- When Streamer Mode is on, the button turns purple and the eye is crossed out. Hover over it to see the current state.
- The button is there whether or not you're on Do Not Disturb. You can hide it in the plugin settings ("Show a button… Streamer Mode"). Restart Discord after changing that setting.

## Installation

Vencord only loads user plugins in a build you compile yourself. You need [Git](https://git-scm.com/), [Node.js](https://nodejs.org/) (LTS) and pnpm (`npm i -g pnpm`).

1. Clone Vencord and install its dependencies:

   ```sh
   git clone https://github.com/Vendicated/Vencord
   cd Vencord
   pnpm install --frozen-lockfile
   ```

2. Clone this plugin into Vencord's `src/userplugins` folder, in a folder named `dndFocus`:

   ```sh
   git clone https://github.com/lucasdonini0/discord-dnd-plugin-vencord src/userplugins/dndFocus
   ```

3. Build Vencord and inject it into Discord:

   ```sh
   pnpm build
   pnpm inject
   ```

   For `pnpm inject`, close Discord first, then pick your Discord install in the installer.

4. Open Discord, go to **Settings → Vencord → Plugins**, search for **DndFocus** and turn it on.

**Updating:** run `git pull` inside `src/userplugins/dndFocus`, run `pnpm build` again, then reload Discord with `Ctrl+R`.

> Client mods like Vencord go against Discord's Terms of Service. Use them at your own risk.
