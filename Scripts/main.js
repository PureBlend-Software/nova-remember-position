//
// Remember Position for Nova
// ------------------------------------------------------------------
// Reopens each document scrolled to the cursor location it had the last time
// it was open. Positions are stored globally (via nova.config), keyed by the
// document's URI, so they survive quitting Nova and apply across windows.
//

const STORE_KEY = "remember-position.positions";
const MAX_ENTRIES = 2000; // cap the stored map so it can't grow without bound

let positions = {}; // { [documentURI]: characterOffset }
const tracked = new WeakSet(); // editors we've already wired up

function load() {
    const raw = nova.config.get(STORE_KEY);
    if (typeof raw === "string" && raw.length) {
        try {
            positions = JSON.parse(raw) || {};
        } catch (err) {
            positions = {};
        }
    }
}

function persist() {
    const keys = Object.keys(positions);
    if (keys.length > MAX_ENTRIES) {
        // Objects preserve insertion order; drop the oldest entries.
        for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) {
            delete positions[key];
        }
    }
    nova.config.set(STORE_KEY, JSON.stringify(positions));
}

// Update the in-memory position for an editor (cheap; no disk write).
function rememberInMemory(editor) {
    const doc = editor.document;
    if (!doc || doc.isUntitled || !doc.uri) return;
    const offset = editor.selectedRange.start;
    delete positions[doc.uri]; // re-insert so it counts as most-recently-used
    positions[doc.uri] = offset;
}

// Move the cursor + scroll to the saved position, if any.
function restore(editor) {
    const doc = editor.document;
    if (!doc || doc.isUntitled || !doc.uri) return;
    if (!(doc.uri in positions)) return;

    let offset = positions[doc.uri];
    if (typeof offset !== "number" || offset < 0) return;
    if (offset > doc.length) offset = doc.length; // file shrank since last time

    editor.selectedRange = new Range(offset, offset);
    editor.scrollToPosition(offset);
}

function track(editor) {
    if (tracked.has(editor)) return;
    tracked.add(editor);

    // Jump to where we left off...
    restore(editor);

    // ...then keep the stored position current as the user works.
    const listeners = [
        editor.onDidChangeSelection(() => rememberInMemory(editor)),
        editor.onDidStopChanging(() => {
            rememberInMemory(editor);
            persist();
        }),
        editor.onDidSave(() => {
            rememberInMemory(editor);
            persist();
        })
    ];

    editor.onDidDestroy(() => {
        rememberInMemory(editor);
        persist();
        for (const listener of listeners) listener.dispose();
        tracked.delete(editor);
    });
}

exports.activate = function () {
    load();
    // Editors already open when the extension activates (e.g. a reopened window).
    for (const editor of nova.workspace.textEditors) {
        track(editor);
    }
    // Editors opened afterwards.
    nova.workspace.onDidAddTextEditor((editor) => track(editor));
};

exports.deactivate = function () {
    // Capture the latest cursor of everything still open, then flush.
    for (const editor of nova.workspace.textEditors) {
        rememberInMemory(editor);
    }
    persist();
};

// Utility: forget every saved position.
nova.commands.register("rememberposition.clear", () => {
    positions = {};
    nova.config.set(STORE_KEY, JSON.stringify(positions));
    nova.workspace.showInformativeMessage(
        "Remember Position: cleared all saved positions."
    );
});
