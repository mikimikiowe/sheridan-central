import { h, icon } from '../dom.js';
import { getEvents } from '../api.js';
import { state } from '../state.js';
import { sortKey, isThisWeek } from '../format.js';
import { eventCard } from '../components/eventCard.js';
import { pageHeader, bellButton } from '../components/header.js';
import { openNotifications } from '../components/notifications.js';

// Filter choices live here so they survive going to an event and back.
const filters = { campus: new Set(), org: new Set(), time: new Set(), week: false };
const CAMPUSES = ['Trafalgar', 'HMC', 'Davis'];
const TIMES = ['Morning', 'Afternoon', 'Evening'];

const activeCount = () => filters.campus.size + filters.org.size + filters.time.size + (filters.week ? 1 : 0);

// The organizations are whatever sources the real events come from (SSU, Sheridan Clubs, EDGE, ...)
const organizations = () => [...new Set(state.events.map(e => e.source_name))].sort();

function matches(e) {
    if (filters.campus.size && !filters.campus.has(e.campus)) return false;
    if (filters.org.size && !filters.org.has(e.source_name)) return false;
    if (filters.time.size && !filters.time.has(e.time_of_day)) return false;
    if (filters.week && !isThisWeek(e)) return false;
    return true;
}

export async function renderFeed(root, { onBadges } = {}) {
    const list = h('div', { class: 'cards' });
    const bar = h('div', { class: 'filter-bar' });
    const panelHost = h('div', { class: 'filter-host' });
    const wrap = h('div', { class: 'filter-wrap' }, bar, panelHost);
    const count = h('div', { class: 'count-line' });
    let open = false;

    root.replaceChildren(
        pageHeader('Sheridan Central', { right: bellButton(() => openNotifications({ onChange: onBadges })), below: wrap }),
        count, list);

    const refresh = () => { paintBar(); paintPanel(); paintList(); };
    const toggle = (set, value) => () => { set.has(value) ? set.delete(value) : set.add(value); refresh(); };
    const clearAll = () => { filters.campus.clear(); filters.org.clear(); filters.time.clear(); filters.week = false; refresh(); };

    // Row: the Filters drop-down button, then a removable chip for each filter that is on
    function paintBar() {
        const n = activeCount();
        const active = [
            ...[...filters.campus].map(v => [v, toggle(filters.campus, v)]),
            ...[...filters.org].map(v => [v, toggle(filters.org, v)]),
            ...[...filters.time].map(v => [v, toggle(filters.time, v)]),
            ...(filters.week ? [['This week', () => { filters.week = false; refresh(); }]] : []),
        ];
        bar.replaceChildren(
            h('button', { class: 'chip summary', type: 'button', 'aria-expanded': String(open), 'aria-controls': 'filter-panel',
                onClick: () => { open = !open; paintBar(); paintPanel(); } },
                icon('filters'), `Filters (${n})`, icon('chevron')),
            ...active.map(([label, remove]) => h('button', { class: 'chip on', type: 'button', 'aria-label': `Remove filter ${label}`, onClick: remove },
                label, icon('x'))));
    }

    // The drop-down panel itself
    function paintPanel() {
        if (!open) { panelHost.replaceChildren(); return; }
        const group = (title, options, isOn, flip) => h('fieldset', { class: 'filter-group' },
            h('legend', {}, title),
            h('div', { class: 'opts' }, options.map(o => h('button', { class: `opt${isOn(o) ? ' on' : ''}`, type: 'button', 'aria-pressed': String(isOn(o)), onClick: flip(o) }, o))));
        panelHost.replaceChildren(h('div', { class: 'filter-panel', id: 'filter-panel' },
            group('Campus', CAMPUSES, o => filters.campus.has(o), o => toggle(filters.campus, o)),
            group('Organization', organizations(), o => filters.org.has(o), o => toggle(filters.org, o)),
            group('Time of day', TIMES, o => filters.time.has(o), o => toggle(filters.time, o)),
            group('When', ['This week'], () => filters.week, () => () => { filters.week = !filters.week; refresh(); }),
            h('div', { class: 'filter-actions' },
                h('button', { class: 'btn outline small', type: 'button', disabled: activeCount() === 0, onClick: clearAll }, 'Clear all'),
                h('button', { class: 'btn primary small', type: 'button', onClick: () => { open = false; paintBar(); paintPanel(); } }, 'Done'))));
    }

    // Tapping outside the panel, or pressing Esc, closes it
    const onDocClick = (e) => {
        if (!open || !root.isConnected) return document.removeEventListener('click', onDocClick);
        // composedPath is fixed when the click happens, so redrawing a button mid-click can't fool it
        if (!e.composedPath().includes(wrap)) { open = false; paintBar(); paintPanel(); }
    };
    const onKey = (e) => {
        if (!root.isConnected) return document.removeEventListener('keydown', onKey);
        if (e.key === 'Escape' && open) { open = false; paintBar(); paintPanel(); }
    };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);

    function paintList() {
        const shown = state.events.filter(matches);
        count.textContent = `Showing ${shown.length} event${shown.length === 1 ? '' : 's'}`;
        list.replaceChildren(...(shown.length
            ? shown.map(e => eventCard(e))
            : [h('div', { class: 'message' }, h('h2', {}, 'No events match'), h('p', {}, 'Try removing a filter.'))]));
    }

    paintBar();

    // Loading state: grey placeholder cards while the real data arrives
    count.textContent = 'Loading events…';
    list.replaceChildren(h('div', { class: 'skeleton card-sk' }), h('div', { class: 'skeleton card-sk' }));

    try {
        const data = await getEvents();
        state.events = data.events.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
        paintList();
        window.scrollTo(0, state.scroll['#/events'] || 0); // back to where you were
    } catch (error) {
        count.textContent = '';
        list.replaceChildren(h('div', { class: 'message' },
            h('h2', {}, "Couldn't load events"), h('p', {}, error.message),
            h('button', { class: 'btn primary', type: 'button', onClick: () => renderFeed(root, { onBadges }) }, 'Retry')));
    }
}
