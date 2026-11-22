import { h } from '../dom.js';

// An on/off switch. onChange(newValue) may return a promise; if it throws, the switch flips back.
export function toggleSwitch(label, value, onChange) {
    const btn = h('button', { class: 'switch', type: 'button', role: 'switch', 'aria-label': label });
    let on = value;
    const paint = () => btn.setAttribute('aria-checked', String(on));
    paint();
    btn.addEventListener('click', async () => {
        on = !on; paint();
        try { await onChange(on); } catch { on = !on; paint(); }
    });
    return btn;
}
