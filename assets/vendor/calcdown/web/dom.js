export function clear(el) {
    while (el.firstChild)
        el.removeChild(el.firstChild);
}
export function byId(id, ctor, description) {
    const el = document.getElementById(id);
    if (!(el instanceof ctor))
        throw new Error(`Missing ${description} (#${id})`);
    return el;
}
