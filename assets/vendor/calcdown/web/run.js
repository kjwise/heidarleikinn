import { evaluateProgram, parseProgram } from "../index.js";
import { validateViewsFromBlocks } from "../view_contract.js";
export function runCalcdown(markdown, opts = {}) {
    const parsed = parseProgram(markdown);
    const evaluated = evaluateProgram(parsed.program, opts.overrides ?? {}, opts.context ?? {});
    const validated = validateViewsFromBlocks(parsed.program.blocks);
    const viewMessages = [...validated.messages];
    if (opts.validateViewSources ?? true) {
        const known = new Set();
        for (const t of parsed.program.tables)
            known.add(t.name);
        for (const n of parsed.program.nodes)
            known.add(n.name);
        for (const v of validated.views) {
            if (v.type !== "table" && v.type !== "chart")
                continue;
            const src = v.source;
            if (!known.has(src)) {
                viewMessages.push({
                    severity: "error",
                    code: "CD_VIEW_UNKNOWN_SOURCE",
                    message: `View source does not exist: ${src}`,
                    line: v.line,
                    blockLang: "view",
                    nodeName: v.id,
                });
            }
        }
    }
    return {
        program: parsed.program,
        values: evaluated.values,
        views: validated.views,
        parseMessages: parsed.messages,
        evalMessages: evaluated.messages,
        viewMessages,
    };
}
