/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { useState } from "@webpack/common";
import img1 from "file://images/1.jpg?base64";
import img2 from "file://images/2.jpg?base64";
import img3 from "file://images/3.jpg?base64";
import img4 from "file://images/4.jpg?base64";
import img5 from "file://images/5.jpg?base64";
import img6 from "file://images/6.jpg?base64";
import img7 from "file://images/7.jpg?base64";
import img8 from "file://images/8.jpg?base64";

const IMAGES = [img1, img2, img3, img4, img5, img6, img7, img8].map(b64 => `data:image/jpeg;base64,${b64}`);

const randomIndex = (exclude?: number) => {
    let i: number;
    do i = Math.floor(Math.random() * IMAGES.length);
    while (i === exclude && IMAGES.length > 1);
    return i;
};

function LockScreen() {
    const [index, setIndex] = useState(() => randomIndex());
    const [shakes, setShakes] = useState(0);

    return (
        <main className="vc-dndfocus-lock">
            <img
                // Changing the key remounts the image, which restarts the shake animation
                key={shakes}
                className={"vc-dndfocus-lock-img" + (shakes > 0 ? " vc-dndfocus-shake" : "")}
                src={IMAGES[index]}
                alt=""
                draggable={false}
                onClick={() => {
                    setIndex(randomIndex(index));
                    setShakes(s => s + 1);
                }}
            />
            <div className="vc-dndfocus-lock-dnd">You're on dnd</div>
            <div className="vc-dndfocus-lock-title">LOCK TF IN</div>
        </main>
    );
}

export default ErrorBoundary.wrap(LockScreen, { noop: false });
