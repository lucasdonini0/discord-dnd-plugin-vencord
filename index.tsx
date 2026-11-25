/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./styles.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { getUserSettingLazy } from "@api/UserSettings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { Channel, Guild, User } from "@vencord/discord-types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, Menu, NavigationRouter, SelectedChannelStore, SelectedGuildStore } from "@webpack/common";

import LockScreen from "./LockScreen";
import { ListKey, parseIds, settings, toggleId } from "./settings";
import StreamerButton from "./StreamerButton";

const logger = new Logger("DndFocus");
const IconsModule = findByPropsLazy("HomeIcon");
const StatusSettings = getUserSettingLazy<string>("status", "status")!;

const getIds = (key: ListKey) => parseIds(settings.store[key]);

const isDnd = () => StatusSettings.getSetting() === "dnd";

// Called during render so the guild bar and DM list re-render when the status or the lists change
function useHiddenKey() {
    const status = StatusSettings.useSetting();
    const { allowedUsers, allowedGuilds, allowedGroups } = settings.use(["allowedUsers", "allowedGuilds", "allowedGroups"]);
    return status === "dnd" ? `${allowedUsers}|${allowedGuilds}|${allowedGroups}` : "";
}

function isChannelAllowed(channel: Channel) {
    if (channel.isDM()) return getIds("allowedUsers").has(channel.getRecipientId()!);
    if (channel.isGroupDM()) return getIds("allowedGroups").has(channel.id);
    return true;
}

function isLocationHidden(guildId?: string | null, channelId?: string | null) {
    if (guildId) return !getIds("allowedGuilds").has(guildId);
    const channel = channelId ? ChannelStore.getChannel(channelId) : null;
    return channel ? !isChannelAllowed(channel) : false;
}

// Sends you back to the friends page if you're in a server or DM that isn't allowed
function kickIfHidden(guildId?: string | null, channelId?: string | null) {
    try {
        if (!isDnd() || !isLocationHidden(guildId, channelId)) return;
        // Navigating dispatches, so it can't happen inside the current dispatch
        setTimeout(() => NavigationRouter.transitionTo("/channels/@me"));
    } catch (e) {
        logger.error("kickIfHidden failed", e);
    }
}

const kickFromCurrent = () => kickIfHidden(SelectedGuildStore.getGuildId(), SelectedChannelStore.getChannelId());

function makeToggleItem(key: ListKey, id: string) {
    const allowed = getIds(key).has(id);
    return (
        <Menu.MenuCheckboxItem
            id="vc-dnd-focus-toggle"
            label="Show in Do Not Disturb"
            checked={allowed}
            action={() => { toggleId(key, id); kickFromCurrent(); }}
        />
    );
}

const UserContext: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user) return;
    children.push(<Menu.MenuSeparator />, makeToggleItem("allowedUsers", user.id));
};

const GuildContext: NavContextMenuPatchCallback = (children, { guild }: { guild?: Guild; }) => {
    if (!guild) return;
    const group = findGroupChildrenByChildId("privacy", children);
    (group ?? children).push(makeToggleItem("allowedGuilds", guild.id));
};

const GroupDMContext: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel) return;
    const group = findGroupChildrenByChildId("leave-channel", children);
    (group ?? children).unshift(makeToggleItem("allowedGroups", channel.id));
};

export default definePlugin({
    name: "DndFocus",
    description: "While on Do Not Disturb, hides all servers and DMs except the people, groups and servers you allow (right click → Show in Do Not Disturb, or pick them in the plugin settings).",
    authors: [{ name: "lucas", id: 0n }],
    dependencies: ["ServerListAPI"],
    settings,

    contextMenus: {
        "user-context": UserContext,
        "guild-context": GuildContext,
        "gdm-context": GroupDMContext
    },

    patches: [
        // Server list (guilds and folders)
        {
            find: '("guildsnav")',
            replacement: [
                {
                    match: /switch\((\i)\.type\){.+?default:return null}/,
                    replace: "if(!$self.shouldShowGuildNode($1))return null;$&"
                },
                {
                    // Add our state to the node renderer callback dependencies, so nodes re-render when it changes
                    match: /switch\(\i\.type\).+?,\i,\i\.setNodeRef/,
                    replace: "$&,$self.useHiddenKey()"
                }
            ]
        },
        // DM list
        {
            find: '"dm-quick-launcher"===',
            replacement: {
                match: /(?<=channels:\i,privateChannelIds:)\i(?=,listRef:|\.filter\()/,
                replace: "$self.filterPrivateChannels($&)"
            }
        },
        {
            find: '.FRIENDS},"friends"',
            replacement: [
                {
                    match: /let{showLibrary:\i,/,
                    replace: "$self.useHiddenKey();$&"
                },
                // Friends button becomes a Home button (it leads to the lock screen)
                {
                    match: /icon:(\i\.FriendsIcon),text:(\i\.intl\.string\(\i\.t\.TdEu5X\))/,
                    replace: 'icon:$self.isDndSafe()?$self.HomeIcon:$1,text:$self.isDndSafe()?"Home":$2'
                },
                {
                    // Pending friend requests badge
                    match: /(?<=\.\.\.\i,\.\.\.\i,children:)(?=\i>0\?)/,
                    replace: "!$self.isDndSafe()&&"
                },
                // Hide Nitro, Shop and Quests buttons
                {
                    match: /(?=\i\?\(0,\i\.jsxs\)\("div",\{.{0,40}?children:\[\(0,\i\.jsx\)\(\i,\{nitroTabButtonRef:)/,
                    replace: "!$self.isDndSafe()&&"
                },
                {
                    match: /(?=\(0,\i\.jsx\)\(\i,\{selected:\i\.startsWith\(\i\.\i\.COLLECTIBLES_SHOP\))/,
                    replace: "$self.isDndSafe()?null:"
                },
                {
                    match: /(?=\(0,\i\.jsx\)\(\i,\{selected:\i\.startsWith\(\i\.\i\.QUEST_HOME\)\},"quests"\))/,
                    replace: "$self.isDndSafe()?null:"
                }
            ]
        },
        // Friends page, replaced by the lock screen
        {
            find: '"confirm-age"',
            replacement: {
                match: /(?<=return \i=\i===\i\.\i\.ADD_FRIEND\?.{0,60}?,)(?=\(0,\i\.jsxs\)\("main",)/,
                replace: "$self.useIsDnd()?$self.LockScreen():"
            }
        },
        // "NEW" unread bars at the top and bottom of the server list
        {
            find: ".getStoreChangeSentinel())),",
            replacement: {
                match: /return(?=\(0,\i\.jsx\)\(\i\.\i,\{\.\.\.\i,ref:\i,items:\i,isUnread:)/,
                replace: "return $self.useIsDnd()?null:"
            }
        },
        // Unread DM bubbles at the top of the server list
        {
            find: 'id:"guild-list-unread-dms"',
            replacement: [
                {
                    match: /(?<=function \i\(\){)(?=\(0,\i\.\i\)\(\[\i\.\i\],\(\)=>\i\.\i\.getPrivateChannelsVersion\(\)\))/,
                    replace: "$self.useHiddenKey();"
                },
                {
                    match: /(let (\i)=\i\[\i\];return null==\2)(\|\|\2\.id===\i\?null:)/,
                    replace: "$1||!$self.isChannelVisible($2)$3"
                }
            ]
        }
    ],

    start() {
        if (settings.store.streamerButton) addServerListElement(ServerListRenderPosition.Above, StreamerButton);
        kickFromCurrent();
    },

    stop() {
        removeServerListElement(ServerListRenderPosition.Above, StreamerButton);
    },

    flux: {
        CHANNEL_SELECT({ guildId, channelId }: { guildId?: string | null; channelId?: string | null; }) {
            kickIfHidden(guildId, channelId);
        },
        // Status changes
        USER_SETTINGS_PROTO_UPDATE() {
            setTimeout(kickFromCurrent);
        },
        CONNECTION_OPEN() {
            setTimeout(kickFromCurrent);
        }
    },

    useHiddenKey,
    LockScreen,
    HomeIcon: ErrorBoundary.wrap((props: any) => <IconsModule.HomeIcon {...props} />, { noop: true }),

    useIsDnd: () => StatusSettings.useSetting() === "dnd",

    isDndSafe() {
        try {
            return isDnd();
        } catch (e) {
            logger.error("isDnd failed", e);
            return false;
        }
    },

    isChannelVisible(channel: Channel) {
        try {
            return !isDnd() || isChannelAllowed(channel);
        } catch (e) {
            logger.error("isChannelVisible failed", e);
            return true;
        }
    },

    shouldShowGuildNode(node: { type: string; id: string; children?: { id: string; }[]; }) {
        try {
            if (!isDnd()) return true;

            const guilds = getIds("allowedGuilds");
            if (node.type === "guild") return guilds.has(node.id);
            if (node.type === "folder") return node.children?.some(c => guilds.has(c.id)) ?? false;
        } catch (e) {
            logger.error("shouldShowGuildNode failed", e);
        }
        return true;
    },

    filterPrivateChannels(ids: string[]) {
        try {
            if (!isDnd()) return ids;

            return ids.filter(id => {
                const channel = ChannelStore.getChannel(id);
                return !channel || isChannelAllowed(channel);
            });
        } catch (e) {
            logger.error("filterPrivateChannels failed", e);
            return ids;
        }
    }
});
