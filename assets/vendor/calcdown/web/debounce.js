export function createDebouncer(ms) {
    const delay = Number.isFinite(ms) ? Math.max(0, Math.trunc(ms)) : 0;
    let timer = null;
    return {
        schedule(fn) {
            if (timer !== null)
                window.clearTimeout(timer);
            timer = window.setTimeout(() => {
                timer = null;
                fn();
            }, delay);
        },
        cancel() {
            if (timer !== null) {
                window.clearTimeout(timer);
                timer = null;
            }
        },
    };
}
