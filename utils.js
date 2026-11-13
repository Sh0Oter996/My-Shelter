'use strict';

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function randomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function ensurePoolSize(pool, needed, label) {
    const result = pool.slice();
    let n = 1;
    while (result.length < needed) result.push(`${label} ${n++}`);
    return result;
}
function $(id) { return document.getElementById(id); }
function log(msg) {
    const el = $('log');
    el.innerHTML += msg + '<br>';
    el.scrollTop = el.scrollHeight;
}
function displayValue(field, player) {
    const raw = player[field.key];
    if (raw === CUSTOM_MARKER) return '✏️ Придумай сам';
    if (field.key === 'age') return player.age + ' лет';
    return raw;
}
function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function signed(value) {
    return value > 0 ? `+${value}` : String(value);
}
