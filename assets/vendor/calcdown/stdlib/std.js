import { addMonthsUTC, formatIsoDate, parseIsoDate } from "../util/date.js";
function makeModule(entries) {
    const obj = Object.assign(Object.create(null), entries);
    return Object.freeze(obj);
}
const bannedProperties = new Set(["__proto__", "prototype", "constructor"]);
function assertSafeKey(key, prefix) {
    if (!key)
        throw new Error(`${prefix}: expected key string`);
    if (bannedProperties.has(key))
        throw new Error(`${prefix}: disallowed key: ${key}`);
}
const LOOKUP_INDEX = Symbol("calcdown.lookup.index");
function mapKeyOf(v) {
    if (typeof v === "string")
        return `s:${v}`;
    if (typeof v === "number") {
        if (!Number.isFinite(v))
            return null;
        return `n:${String(v)}`;
    }
    return null;
}
function asLookupIndex(v) {
    if (!v || (typeof v !== "object" && typeof v !== "function"))
        throw new Error("lookup.get: invalid index");
    if (!(LOOKUP_INDEX in v))
        throw new Error("lookup.get: invalid index");
    return v;
}
function makeLookupIndex(keyColumn, map) {
    const idx = Object.create(null);
    idx[LOOKUP_INDEX] = { keyColumn, map };
    return Object.freeze(idx);
}
function textPartToString(v, label) {
    if (typeof v === "string")
        return v;
    if (typeof v === "number") {
        if (!Number.isFinite(v))
            throw new Error(`${label}: expected finite numbers`);
        return String(v);
    }
    throw new Error(`${label}: expected string or finite number`);
}
function pmt(rate, nper, pv, fv = 0, type = 0) {
    if (!Number.isFinite(rate) || !Number.isFinite(nper) || !Number.isFinite(pv) || !Number.isFinite(fv)) {
        throw new Error("pmt: invalid arguments");
    }
    if (nper === 0)
        throw new Error("pmt: nper must be non-zero");
    if (type !== 0 && type !== 1)
        throw new Error("pmt: type must be 0 or 1");
    if (rate === 0)
        return -(pv + fv) / nper;
    const pow = (1 + rate) ** nper;
    return -(rate * (fv + pv * pow)) / ((1 + rate * type) * (pow - 1));
}
function makeNowGetter(context) {
    const hasKey = Boolean(context) && Object.prototype.hasOwnProperty.call(context, "currentDateTime");
    if (!hasKey)
        return () => new Date();
    const dt = context?.currentDateTime;
    if (!(dt instanceof Date) || Number.isNaN(dt.getTime()))
        throw new Error("std: invalid currentDateTime");
    const fixed = new Date(dt.getTime());
    return () => new Date(fixed.getTime());
}
export function createStd(context) {
    const getNow = makeNowGetter(context);
    let std;
    std = makeModule({
        math: makeModule({
            sum(xs) {
                if (!Array.isArray(xs))
                    throw new Error("sum: expected array");
                let s = 0;
                for (const v of xs) {
                    if (typeof v !== "number" || !Number.isFinite(v))
                        throw new Error("sum: expected finite number array");
                    s += v;
                }
                return s;
            },
            mean(xs) {
                if (!Array.isArray(xs))
                    throw new Error("mean: expected array");
                if (xs.length === 0)
                    throw new Error("mean: empty array");
                let s = 0;
                for (const v of xs) {
                    if (typeof v !== "number" || !Number.isFinite(v))
                        throw new Error("mean: expected finite number array");
                    s += v;
                }
                return s / xs.length;
            },
            minOf(xs) {
                if (!Array.isArray(xs))
                    throw new Error("minOf: expected array");
                if (xs.length === 0)
                    throw new Error("minOf: empty array");
                let min = null;
                for (const v of xs) {
                    if (typeof v !== "number" || !Number.isFinite(v))
                        throw new Error("minOf: expected finite number array");
                    min = min === null ? v : Math.min(min, v);
                }
                return min ?? 0;
            },
            maxOf(xs) {
                if (!Array.isArray(xs))
                    throw new Error("maxOf: expected array");
                if (xs.length === 0)
                    throw new Error("maxOf: empty array");
                let max = null;
                for (const v of xs) {
                    if (typeof v !== "number" || !Number.isFinite(v))
                        throw new Error("maxOf: expected finite number array");
                    max = max === null ? v : Math.max(max, v);
                }
                return max ?? 0;
            },
            round(x, digits = 0) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("round: x must be finite");
                if (typeof digits !== "number" || !Number.isFinite(digits) || !Number.isInteger(digits)) {
                    throw new Error("round: digits must be integer");
                }
                // Spreadsheet-style rounding: half away from zero.
                const roundHalfAwayFromZero = (n) => (n < 0 ? -Math.round(-n) : Math.round(n));
                if (digits === 0)
                    return roundHalfAwayFromZero(x);
                const abs = Math.abs(digits);
                if (abs > 12)
                    throw new Error("round: digits out of range");
                const factor = 10 ** abs;
                if (!Number.isFinite(factor) || factor === 0)
                    throw new Error("round: digits out of range");
                if (digits > 0)
                    return roundHalfAwayFromZero(x * factor) / factor;
                return roundHalfAwayFromZero(x / factor) * factor;
            },
            abs(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("abs: x must be finite");
                return Math.abs(x);
            },
            sign(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("sign: x must be finite");
                const s = Math.sign(x);
                return Object.is(s, -0) ? 0 : s;
            },
            sqrt(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("sqrt: x must be finite");
                const y = Math.sqrt(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            exp(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("exp: x must be finite");
                const y = Math.exp(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            ln(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("ln: x must be finite");
                const y = Math.log(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            log10(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("log10: x must be finite");
                const y = Math.log(x) / Math.LN10;
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            sin(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("sin: x must be finite");
                const y = Math.sin(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            cos(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("cos: x must be finite");
                const y = Math.cos(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            tan(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("tan: x must be finite");
                const y = Math.tan(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            asin(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("asin: x must be finite");
                const y = Math.asin(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            acos(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("acos: x must be finite");
                const y = Math.acos(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            atan(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("atan: x must be finite");
                const y = Math.atan(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            atan2(y, x) {
                if (typeof y !== "number" || !Number.isFinite(y))
                    throw new Error("atan2: y must be finite");
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("atan2: x must be finite");
                const out = Math.atan2(y, x);
                if (!Number.isFinite(out))
                    throw new Error("Non-finite numeric result");
                return out;
            },
            sinh(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("sinh: x must be finite");
                const y = Math.sinh(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            cosh(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("cosh: x must be finite");
                const y = Math.cosh(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            tanh(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("tanh: x must be finite");
                const y = Math.tanh(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            ceil(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("ceil: x must be finite");
                const y = Math.ceil(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            floor(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("floor: x must be finite");
                const y = Math.floor(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            trunc(x) {
                if (typeof x !== "number" || !Number.isFinite(x))
                    throw new Error("trunc: x must be finite");
                const y = Math.trunc(x);
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            pow(base, exp) {
                if (typeof base !== "number" || !Number.isFinite(base))
                    throw new Error("pow: base must be finite");
                if (typeof exp !== "number" || !Number.isFinite(exp))
                    throw new Error("pow: exp must be finite");
                const y = base ** exp;
                if (!Number.isFinite(y))
                    throw new Error("Non-finite numeric result");
                return y;
            },
            E: Math.E,
            PI: Math.PI,
        }),
        text: makeModule({
            concat(...parts) {
                let len = null;
                for (const p of parts) {
                    if (!Array.isArray(p))
                        continue;
                    len = len ?? p.length;
                    if (len !== p.length)
                        throw new Error("concat: array length mismatch");
                }
                if (len === null) {
                    let out = "";
                    for (const p of parts)
                        out += textPartToString(p, "concat");
                    return out;
                }
                const out = new Array(len);
                for (let i = 0; i < len; i++) {
                    let s = "";
                    for (const p of parts) {
                        const v = Array.isArray(p) ? p[i] : p;
                        s += textPartToString(v, `concat [index ${i}]`);
                    }
                    out[i] = s;
                }
                return out;
            },
            repeat(value, count) {
                if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
                    throw new Error("repeat: count must be a non-negative integer");
                }
                if (typeof value === "string")
                    return value.repeat(count);
                if (!Array.isArray(value))
                    throw new Error("repeat: expected string or string array");
                const out = new Array(value.length);
                for (let i = 0; i < value.length; i++) {
                    const v = value[i];
                    if (typeof v !== "string")
                        throw new Error("repeat: expected string array");
                    out[i] = v.repeat(count);
                }
                return out;
            },
        }),
        data: makeModule({
            sequence(count, opts) {
                if (!Number.isFinite(count) || !Number.isInteger(count) || count < 0) {
                    throw new Error("sequence: count must be a non-negative integer");
                }
                const start = opts?.start ?? 1;
                const step = opts?.step ?? 1;
                const out = new Array(count);
                for (let i = 0; i < count; i++)
                    out[i] = start + i * step;
                return out;
            },
            filter(items, predicate) {
                if (!Array.isArray(items))
                    throw new Error("filter: expected array");
                if (typeof predicate !== "function")
                    throw new Error("filter: expected predicate function");
                const out = [];
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (predicate(item, i))
                        out.push(item);
                }
                return out;
            },
            sortBy(rows, key, direction = "asc") {
                if (!Array.isArray(rows))
                    throw new Error("sortBy: expected rows array");
                assertSafeKey(key, "sortBy");
                if (direction !== "asc" && direction !== "desc")
                    throw new Error("sortBy: direction must be 'asc' or 'desc'");
                function getKey(row) {
                    if (!row || typeof row !== "object")
                        throw new Error("sortBy: expected row objects");
                    const rec = row;
                    const v = Object.prototype.hasOwnProperty.call(rec, key) ? rec[key] : undefined;
                    if (v === undefined || v === null)
                        return { kind: "none" };
                    if (v instanceof Date)
                        return { kind: "number", value: v.getTime() };
                    if (typeof v === "number") {
                        if (!Number.isFinite(v))
                            throw new Error("sortBy: expected finite number keys");
                        return { kind: "number", value: v };
                    }
                    if (typeof v === "string")
                        return { kind: "string", value: v };
                    throw new Error("sortBy: unsupported key type");
                }
                const withKeys = rows.map((row, index) => ({ row, index, k: getKey(row) }));
                let kind = null;
                for (const r of withKeys) {
                    if (r.k.kind === "none")
                        continue;
                    kind = kind ?? r.k.kind;
                    if (kind !== r.k.kind)
                        throw new Error("sortBy: mixed key types");
                }
                const dir = direction === "desc" ? -1 : 1;
                withKeys.sort((a, b) => {
                    const ak = a.k;
                    const bk = b.k;
                    if (ak.kind === "none" && bk.kind === "none")
                        return a.index - b.index;
                    if (ak.kind === "none")
                        return 1;
                    if (bk.kind === "none")
                        return -1;
                    if (ak.kind !== bk.kind)
                        return 0;
                    if (ak.kind === "number") {
                        const d = ak.value - bk.value;
                        if (d !== 0)
                            return d * dir;
                        return a.index - b.index;
                    }
                    const cmp = ak.value < bk.value ? -1 : ak.value > bk.value ? 1 : 0;
                    if (cmp !== 0)
                        return cmp * dir;
                    return a.index - b.index;
                });
                return withKeys.map((r) => r.row);
            },
            last(items) {
                if (!Array.isArray(items))
                    throw new Error("last: expected array");
                if (items.length === 0)
                    throw new Error("last: empty array");
                return items[items.length - 1];
            },
            scan(items, reducer, seedOrOptions) {
                if (!Array.isArray(items))
                    throw new Error("scan: expected array items");
                if (typeof reducer !== "function")
                    throw new Error("scan: expected reducer function");
                const seed = seedOrOptions &&
                    typeof seedOrOptions === "object" &&
                    "seed" in seedOrOptions &&
                    Object.prototype.hasOwnProperty.call(seedOrOptions, "seed")
                    ? seedOrOptions.seed
                    : seedOrOptions;
                const out = [];
                let state = seed;
                for (let i = 0; i < items.length; i++) {
                    state = reducer(state, items[i], i);
                    out.push(state);
                }
                return out;
            },
        }),
        table: makeModule({
            col(rows, key) {
                if (!Array.isArray(rows))
                    throw new Error("col: expected rows array");
                assertSafeKey(key, "col");
                const out = [];
                for (const row of rows) {
                    if (!row || typeof row !== "object")
                        throw new Error("col: expected row objects");
                    const v = Object.prototype.hasOwnProperty.call(row, key) ? row[key] : undefined;
                    out.push(v);
                }
                return out;
            },
            map(rows, mapper) {
                if (!Array.isArray(rows))
                    throw new Error("map: expected rows array");
                if (typeof mapper !== "function")
                    throw new Error("map: expected mapper function");
                const out = [];
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || typeof row !== "object")
                        throw new Error("map: expected row objects");
                    out.push(mapper(row, i));
                }
                return out;
            },
            sum(rows, key) {
                const xs = std.table.col(rows, key);
                let s = 0;
                for (const v of xs) {
                    if (typeof v !== "number" || !Number.isFinite(v))
                        throw new Error("sum: expected finite numbers");
                    s += v;
                }
                return s;
            },
            filter(rows, predicate) {
                if (!Array.isArray(rows))
                    throw new Error("filter: expected rows array");
                if (typeof predicate !== "function")
                    throw new Error("filter: expected predicate function");
                const out = [];
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || typeof row !== "object")
                        throw new Error("filter: expected row objects");
                    if (predicate(row, i))
                        out.push(row);
                }
                return out;
            },
            sortBy(rows, key, direction = "asc") {
                return std.data.sortBy(rows, key, direction);
            },
            groupBy(rows, key) {
                if (!Array.isArray(rows))
                    throw new Error("groupBy: expected rows array");
                let getKey;
                if (typeof key === "string") {
                    assertSafeKey(key, "groupBy");
                    getKey = (row) => row[key];
                }
                else if (typeof key === "function") {
                    getKey = key;
                }
                else {
                    throw new Error("groupBy: key must be a string or function");
                }
                const by = new Map();
                const ordered = [];
                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i];
                    if (!row || typeof row !== "object")
                        throw new Error("groupBy: expected row objects");
                    const kv = getKey(row, i);
                    const kind = typeof kv;
                    if (kind !== "string" && kind !== "number") {
                        throw new Error("groupBy: key values must be strings or numbers");
                    }
                    if (kind === "number" && !Number.isFinite(kv)) {
                        throw new Error("groupBy: key values must be finite numbers");
                    }
                    const keyValue = kv;
                    const mapKey = kind === "number" ? `n:${String(keyValue)}` : `s:${String(keyValue)}`;
                    const existing = by.get(mapKey);
                    if (existing) {
                        existing.rows.push(row);
                        continue;
                    }
                    const group = { key: keyValue, rows: [row] };
                    by.set(mapKey, group);
                    ordered.push(group);
                }
                return ordered;
            },
            agg(groups, mapper) {
                if (!Array.isArray(groups))
                    throw new Error("agg: expected groups array");
                if (typeof mapper !== "function")
                    throw new Error("agg: expected mapper function");
                const out = [];
                for (let i = 0; i < groups.length; i++) {
                    const g = groups[i];
                    if (!g || typeof g !== "object")
                        throw new Error("agg: expected group objects");
                    const obj = g;
                    const key = obj.key;
                    const rows = obj.rows;
                    if ((typeof key !== "string" && typeof key !== "number") || (typeof key === "number" && !Number.isFinite(key))) {
                        throw new Error("agg: group.key must be string or finite number");
                    }
                    if (!Array.isArray(rows))
                        throw new Error("agg: group.rows must be an array");
                    const mapped = mapper({ key, rows: rows }, i);
                    if (!mapped || typeof mapped !== "object" || Array.isArray(mapped))
                        throw new Error("agg: mapper must return an object");
                    const row = Object.create(null);
                    for (const k of Object.keys(mapped)) {
                        assertSafeKey(k, "agg");
                        row[k] = mapped[k];
                    }
                    out.push(row);
                }
                return out;
            },
            join(leftRows, rightRows, opts) {
                if (!Array.isArray(leftRows))
                    throw new Error("join: expected leftRows array");
                if (!Array.isArray(rightRows))
                    throw new Error("join: expected rightRows array");
                if (!opts || typeof opts !== "object")
                    throw new Error("join: expected opts object");
                const leftKey = opts.leftKey;
                const rightKey = opts.rightKey;
                if (typeof leftKey !== "string")
                    throw new Error("join: leftKey must be string");
                if (typeof rightKey !== "string")
                    throw new Error("join: rightKey must be string");
                assertSafeKey(leftKey, "join");
                assertSafeKey(rightKey, "join");
                const how = opts.how;
                const mode = how === undefined ? "inner" : how;
                if (mode !== "inner" && mode !== "left")
                    throw new Error("join: how must be 'inner' or 'left'");
                const rightPrefixRaw = opts.rightPrefix;
                const rightPrefix = typeof rightPrefixRaw === "string" ? rightPrefixRaw : "right_";
                const index = new Map();
                for (const rr of rightRows) {
                    if (!rr || typeof rr !== "object")
                        throw new Error("join: expected right row objects");
                    const keyValue = rr[rightKey];
                    const mk = mapKeyOf(keyValue);
                    if (mk === null)
                        throw new Error("join: right key values must be string or finite number");
                    const bucket = index.get(mk) ?? [];
                    bucket.push(rr);
                    index.set(mk, bucket);
                }
                const out = [];
                function merge(left, right) {
                    const row = Object.create(null);
                    for (const k of Object.keys(left)) {
                        assertSafeKey(k, "join");
                        row[k] = left[k];
                    }
                    if (right) {
                        for (const k of Object.keys(right)) {
                            assertSafeKey(k, "join");
                            const targetKey = Object.prototype.hasOwnProperty.call(row, k) ? `${rightPrefix}${k}` : k;
                            assertSafeKey(targetKey, "join");
                            if (Object.prototype.hasOwnProperty.call(row, targetKey)) {
                                throw new Error(`join: key collision for '${targetKey}'`);
                            }
                            row[targetKey] = right[k];
                        }
                    }
                    return row;
                }
                for (const lr of leftRows) {
                    if (!lr || typeof lr !== "object")
                        throw new Error("join: expected left row objects");
                    const leftObj = lr;
                    const keyValue = leftObj[leftKey];
                    const mk = mapKeyOf(keyValue);
                    if (mk === null)
                        throw new Error("join: left key values must be string or finite number");
                    const matches = index.get(mk) ?? [];
                    if (matches.length === 0) {
                        if (mode === "left")
                            out.push(merge(leftObj, null));
                        continue;
                    }
                    for (const rr of matches)
                        out.push(merge(leftObj, rr));
                }
                return out;
            },
        }),
        lookup: makeModule({
            index(rows, keyColumn) {
                if (!Array.isArray(rows))
                    throw new Error("lookup.index: expected rows array");
                if (typeof keyColumn !== "string")
                    throw new Error("lookup.index: keyColumn must be string");
                assertSafeKey(keyColumn, "lookup.index");
                const map = new Map();
                for (const row of rows) {
                    if (!row || typeof row !== "object")
                        throw new Error("lookup.index: expected row objects");
                    const kv = row[keyColumn];
                    const mk = mapKeyOf(kv);
                    if (mk === null)
                        throw new Error("lookup.index: key values must be string or finite number");
                    const bucket = map.get(mk) ?? [];
                    bucket.push(row);
                    map.set(mk, bucket);
                }
                return makeLookupIndex(keyColumn, map);
            },
            get(index, key) {
                const idx = asLookupIndex(index);
                const mk = mapKeyOf(key);
                if (mk === null)
                    throw new Error("lookup.get: key must be string or finite number");
                const bucket = idx[LOOKUP_INDEX].map.get(mk);
                if (!bucket || bucket.length === 0)
                    throw new Error("lookup.get: key not found");
                return bucket[0];
            },
            xlookup(key, rows, keyColumn, valueColumn, notFound) {
                if (!Array.isArray(rows))
                    throw new Error("lookup.xlookup: expected rows array");
                if (typeof keyColumn !== "string")
                    throw new Error("lookup.xlookup: keyColumn must be string");
                if (typeof valueColumn !== "string")
                    throw new Error("lookup.xlookup: valueColumn must be string");
                assertSafeKey(keyColumn, "lookup.xlookup");
                assertSafeKey(valueColumn, "lookup.xlookup");
                const mkNeedle = mapKeyOf(key);
                if (mkNeedle === null)
                    throw new Error("lookup.xlookup: key must be string or finite number");
                for (const row of rows) {
                    if (!row || typeof row !== "object")
                        throw new Error("lookup.xlookup: expected row objects");
                    const kv = row[keyColumn];
                    const mk = mapKeyOf(kv);
                    if (mk === null)
                        throw new Error("lookup.xlookup: key values must be string or finite number");
                    if (mk === mkNeedle)
                        return row[valueColumn];
                }
                if (arguments.length >= 5)
                    return notFound;
                throw new Error("lookup.xlookup: key not found");
            },
        }),
        date: makeModule({
            now() {
                return getNow();
            },
            today() {
                const dt = getNow();
                return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
            },
            parse(value) {
                if (typeof value !== "string")
                    throw new Error("parse: expected ISO date string");
                return parseIsoDate(value);
            },
            format(date, template) {
                if (!(date instanceof Date) || Number.isNaN(date.getTime()))
                    throw new Error("format: invalid date");
                if (typeof template !== "string")
                    throw new Error("format: expected template string");
                if (template === "%Y-%m-%d")
                    return formatIsoDate(date);
                let out = "";
                for (let i = 0; i < template.length; i++) {
                    const ch = template[i];
                    if (ch !== "%") {
                        out += ch;
                        continue;
                    }
                    const next = template[i + 1];
                    if (!next)
                        throw new Error("format: dangling %");
                    i++;
                    if (next === "%") {
                        out += "%";
                        continue;
                    }
                    if (next === "Y") {
                        out += String(date.getUTCFullYear()).padStart(4, "0");
                        continue;
                    }
                    if (next === "m") {
                        out += String(date.getUTCMonth() + 1).padStart(2, "0");
                        continue;
                    }
                    if (next === "d") {
                        out += String(date.getUTCDate()).padStart(2, "0");
                        continue;
                    }
                    throw new Error(`format: unsupported token: %${next}`);
                }
                return out;
            },
            addMonths(date, months) {
                if (!(date instanceof Date) || Number.isNaN(date.getTime()))
                    throw new Error("addMonths: invalid date");
                if (!Number.isFinite(months) || !Number.isInteger(months))
                    throw new Error("addMonths: months must be integer");
                return addMonthsUTC(date, months);
            },
        }),
        finance: makeModule({
            toMonthlyRate(annualPercent) {
                if (!Number.isFinite(annualPercent))
                    throw new Error("toMonthlyRate: annualPercent must be finite");
                return annualPercent / 100 / 12;
            },
            pmt,
        }),
        assert: makeModule({
            that(condition, message = "Assertion failed") {
                if (!condition)
                    throw new Error(message);
            },
        }),
    });
    deepFreeze(std);
    return std;
}
export const std = createStd();
function deepFreeze(value, seen = new WeakSet()) {
    if ((typeof value !== "object" && typeof value !== "function") || value === null)
        return value;
    const obj = value;
    if (seen.has(obj))
        return value;
    seen.add(obj);
    for (const key of Object.keys(value)) {
        deepFreeze(value[key], seen);
    }
    Object.freeze(value);
    return value;
}
deepFreeze(std);
