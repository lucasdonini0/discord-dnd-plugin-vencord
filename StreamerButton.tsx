/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { FluxDispatcher, StreamerModeStore, Tooltip, useStateFromStores } from "@webpack/common";

export function toggleStreamerMode() {
    FluxDispatcher.dispatch({
        type: "STREAMER_MODE_UPDATE",
        key: "enabled",
        value: !StreamerModeStore.enabled
    });
}

function EyeIcon({ off }: { off: boolean; }) {
    return (
        <svg viewBox="0 0 24 24" width={22} height={22} fill="currentColor" aria-hidden>
            <path d="M12 5C6.5 5 2.4 8.6 1 12c1.4 3.4 5.5 7 11 7s9.6-3.6 11-7c-1.4-3.4-5.5-7-11-7Zm0 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Zm0-2.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
            {off && <path d="M3.3 2.3a1 1 0 0 0-1.4 1.4l18.4 18.4a1 1 0 0 0 1.4-1.4L3.3 2.3Z" />}
        </svg>
    );
}

function StreamerButton() {
    const enabled = useStateFromStores([StreamerModeStore], () => StreamerModeStore.enabled);
    const label = enabled ? "Streamer Mode: ON (click to turn off)" : "Streamer Mode: OFF (click to turn on)";

    return (
        <div className="vc-dndfocus-streamer-wrap">
            <Tooltip text={label} position="right">
                {props => (
                    <button
                        {...props}
                        aria-label={label}
                        className={"vc-dndfocus-streamer" + (enabled ? " vc-dndfocus-streamer-on" : "")}
                        onClick={toggleStreamerMode}
                    >
                        <EyeIcon off={enabled} />
                    </button>
                )}
            </Tooltip>
        </div>
    );
}

export default ErrorBoundary.wrap(StreamerButton, { noop: true });
