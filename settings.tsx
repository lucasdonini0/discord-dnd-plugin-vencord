/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Switch } from "@components/Switch";
import { OptionType } from "@utils/types";
import { ChannelStore, GuildStore, IconUtils, RelationshipStore, SortedGuildStore, TextInput, UserStore, useMemo, useState } from "@webpack/common";

export type ListKey = "allowedUsers" | "allowedGuilds" | "allowedGroups";

interface Entry {
    id: string;
    name: string;
    subtitle?: string;
    icon?: string;
}

const TABS: { key: ListKey; label: string; }[] = [
    { key: "allowedGuilds", label: "Servers" },
    { key: "allowedUsers", label: "People" },
    { key: "allowedGroups", label: "Groups" }
];

export const parseIds = (value: string) => new Set(value.split(/[\s,]+/).filter(Boolean));

export function toggleId(key: ListKey, id: string) {
    const ids = parseIds(settings.store[key]);
    if (!ids.delete(id)) ids.add(id);
    settings.store[key] = [...ids].join(",");
}

function getGuildEntries(): Entry[] {
    return SortedGuildStore.getFlattenedGuildIds().flatMap(id => {
        const guild = GuildStore.getGuild(id);
        if (!guild) return [];
        return [{ id, name: guild.name, icon: IconUtils.getGuildIconURL({ id, icon: guild.icon ?? undefined, size: 64 }) }];
    });
}

function getUserEntries(allowed: Set<string>): Entry[] {
    const dmUserIds = ChannelStore.getSortedPrivateChannels()
        .filter(c => c.isDM())
        .map(c => c.getRecipientId()!);

    const ids = new Set([...dmUserIds, ...RelationshipStore.getFriendIDs(), ...allowed]);

    return [...ids].flatMap(id => {
        const user = UserStore.getUser(id);
        if (!user) return [];
        return [{
            id,
            name: user.globalName || user.username,
            subtitle: user.username,
            icon: IconUtils.getUserAvatarURL(user, false, 64)
        }];
    });
}

function getGroupEntries(): Entry[] {
    return ChannelStore.getSortedPrivateChannels()
        .filter(c => c.isGroupDM())
        .map(c => ({
            id: c.id,
            name: c.name || c.recipients.map(id => UserStore.getUser(id)?.username ?? id).join(", "),
            icon: c.icon ? IconUtils.getChannelIconURL({ id: c.id, icon: c.icon, size: 64 }) : undefined
        }));
}

function getEntries(key: ListKey, allowed: Set<string>) {
    switch (key) {
        case "allowedGuilds": return getGuildEntries();
        case "allowedUsers": return getUserEntries(allowed);
        case "allowedGroups": return getGroupEntries();
    }
}

function Picker() {
    const [tab, setTab] = useState<ListKey>("allowedGuilds");
    const [search, setSearch] = useState("");
    const values = settings.use(["allowedUsers", "allowedGuilds", "allowedGroups"]);

    const allowed = parseIds(values[tab]);
    const entries = useMemo(() => getEntries(tab, allowed), [tab]);

    const query = search.trim().toLowerCase();
    const shown = entries
        .filter(e => !query || e.name.toLowerCase().includes(query) || e.subtitle?.toLowerCase().includes(query))
        .sort((a, b) => Number(allowed.has(b.id)) - Number(allowed.has(a.id)));

    return (
        <div className="vc-dndfocus-picker">
            <div className="vc-dndfocus-tabs">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        className={"vc-dndfocus-tab" + (tab === t.key ? " vc-dndfocus-tab-active" : "")}
                        onClick={() => { setTab(t.key); setSearch(""); }}
                    >
                        {t.label} ({parseIds(values[t.key]).size})
                    </button>
                ))}
            </div>

            <TextInput placeholder="Search..." value={search} onChange={setSearch} />

            <div className="vc-dndfocus-list">
                {shown.length === 0 && <div className="vc-dndfocus-empty">Nothing found</div>}
                {shown.map(e => (
                    <div key={e.id} className="vc-dndfocus-row" onClick={() => toggleId(tab, e.id)}>
                        {e.icon
                            ? <img className="vc-dndfocus-icon" src={e.icon} alt="" />
                            : <div className="vc-dndfocus-icon vc-dndfocus-icon-fallback">{e.name[0]}</div>}
                        <div className="vc-dndfocus-names">
                            <span className="vc-dndfocus-name">{e.name}</span>
                            {e.subtitle && e.subtitle !== e.name && <span className="vc-dndfocus-subtitle">{e.subtitle}</span>}
                        </div>
                        <div onClick={ev => ev.stopPropagation()}>
                            <Switch checked={allowed.has(e.id)} onChange={() => toggleId(tab, e.id)} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export const settings = definePluginSettings({
    streamerButton: {
        type: OptionType.BOOLEAN,
        description: "Show a button at the top of the server list to turn Streamer Mode on and off",
        default: true,
        restartNeeded: true
    },
    picker: {
        type: OptionType.COMPONENT,
        component: ErrorBoundary.wrap(Picker, { noop: false })
    },
    allowedUsers: {
        type: OptionType.STRING,
        description: "Allowed user IDs",
        default: "",
        hidden: true
    },
    allowedGuilds: {
        type: OptionType.STRING,
        description: "Allowed server IDs",
        default: "",
        hidden: true
    },
    allowedGroups: {
        type: OptionType.STRING,
        description: "Allowed group DM IDs",
        default: "",
        hidden: true
    }
});
