import { clear } from "./dom.js";
import { renderCalcdownViews } from "./render_views.js";
import { runCalcdown } from "./run.js";
import { renderCalcdownDocument, updateCalcdownDocumentViews } from "./render_document.js";
export function mountCalcdown(container, markdown, opts = {}) {
    const root = document.createElement("div");
    root.className = "calcdown-root";
    const viewsEl = document.createElement("div");
    viewsEl.className = "calcdown-views";
    root.appendChild(viewsEl);
    const messagesEl = document.createElement("pre");
    messagesEl.className = "calcdown-messages";
    container.appendChild(root);
    let lastMsgs = [];
    let showMessages = Boolean(opts.showMessages);
    function render(nextMarkdown, nextOpts) {
        const runOpts = Object.create(null);
        if (nextOpts.overrides !== undefined)
            runOpts.overrides = nextOpts.overrides;
        if (nextOpts.context !== undefined)
            runOpts.context = nextOpts.context;
        const res = runCalcdown(nextMarkdown, runOpts);
        const tableSchemas = Object.create(null);
        for (const t of res.program.tables)
            tableSchemas[t.name] = t;
        const renderOpts = { container: viewsEl, views: res.views, values: res.values };
        if (nextOpts.chartMode !== undefined)
            renderOpts.chartMode = nextOpts.chartMode;
        renderOpts.tableSchemas = tableSchemas;
        if (nextOpts.onEditTableCell)
            renderOpts.onEditTableCell = nextOpts.onEditTableCell;
        renderCalcdownViews(renderOpts);
        lastMsgs = [...res.parseMessages, ...res.evalMessages, ...res.viewMessages];
        if (showMessages) {
            if (!messagesEl.isConnected)
                root.appendChild(messagesEl);
            messagesEl.textContent = JSON.stringify(lastMsgs, null, 2);
        }
        else if (messagesEl.isConnected) {
            messagesEl.remove();
        }
    }
    render(markdown, opts);
    return {
        update(nextMarkdown, updateOpts) {
            const merged = Object.assign(Object.create(null), opts, updateOpts ?? {});
            showMessages = Boolean(merged.showMessages);
            render(nextMarkdown, merged);
        },
        destroy() {
            clear(viewsEl);
            if (messagesEl.isConnected)
                messagesEl.remove();
            root.remove();
        },
        lastMessages() {
            return [...lastMsgs];
        },
    };
}
export function mountCalcdownDocument(container, markdown, opts = {}) {
    const root = document.createElement("div");
    root.className = "calcdown-root";
    const docEl = document.createElement("div");
    docEl.className = "calcdown-doc";
    root.appendChild(docEl);
    const messagesEl = document.createElement("pre");
    messagesEl.className = "calcdown-messages";
    container.appendChild(root);
    let lastMsgs = [];
    let showMessages = Boolean(opts.showMessages);
    let currentMarkdown = markdown;
    let currentOpts = opts;
    let currentOverrides = Object.assign(Object.create(null), opts.overrides ?? {});
    let state = null;
    function tableSchemasFrom(run) {
        const tableSchemas = Object.create(null);
        for (const t of run.program.tables)
            tableSchemas[t.name] = t;
        return tableSchemas;
    }
    function renderMessages(msgs) {
        lastMsgs = msgs;
        if (showMessages) {
            if (!messagesEl.isConnected)
                root.appendChild(messagesEl);
            messagesEl.textContent = JSON.stringify(lastMsgs, null, 2);
        }
        else if (messagesEl.isConnected) {
            messagesEl.remove();
        }
    }
    function recomputeViewsOnly() {
        if (!state)
            return;
        const runOpts = Object.create(null);
        runOpts.overrides = currentOverrides;
        if (currentOpts.context !== undefined)
            runOpts.context = currentOpts.context;
        const res = runCalcdown(currentMarkdown, runOpts);
        const updated = updateCalcdownDocumentViews(state, res, {
            ...(currentOpts.chartMode ? { chartMode: currentOpts.chartMode } : {}),
            tableSchemas: tableSchemasFrom(res),
            ...(currentOpts.onEditTableCell ? { onEditTableCell: currentOpts.onEditTableCell } : {}),
        });
        renderMessages(updated.messages);
    }
    function build(nextMarkdown, nextOpts) {
        currentMarkdown = nextMarkdown;
        currentOpts = nextOpts;
        const runOpts = Object.create(null);
        runOpts.overrides = currentOverrides;
        if (nextOpts.context !== undefined)
            runOpts.context = nextOpts.context;
        const res = runCalcdown(nextMarkdown, runOpts);
        const tableSchemas = tableSchemasFrom(res);
        state = renderCalcdownDocument({
            container: docEl,
            markdown: nextMarkdown,
            run: res,
            overrides: currentOverrides,
            ...(nextOpts.chartMode ? { chartMode: nextOpts.chartMode } : {}),
            tableSchemas,
            ...(nextOpts.onEditTableCell ? { onEditTableCell: nextOpts.onEditTableCell } : {}),
            ...(nextOpts.showSourceBlocks ? { showSourceBlocks: true } : {}),
            onInputChange: (ev) => {
                currentOverrides[ev.name] = ev.value;
                recomputeViewsOnly();
            },
        });
        renderMessages(state.messages);
    }
    build(markdown, opts);
    return {
        update(nextMarkdown, updateOpts) {
            const merged = Object.assign(Object.create(null), currentOpts, updateOpts ?? {});
            showMessages = Boolean(merged.showMessages);
            if (updateOpts && Object.prototype.hasOwnProperty.call(updateOpts, "overrides")) {
                currentOverrides = Object.assign(Object.create(null), updateOpts.overrides ?? {});
            }
            build(nextMarkdown, merged);
        },
        destroy() {
            clear(docEl);
            if (messagesEl.isConnected)
                messagesEl.remove();
            root.remove();
            state = null;
        },
        lastMessages() {
            return [...lastMsgs];
        },
    };
}
