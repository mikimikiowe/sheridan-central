import { h } from '../dom.js';

// The coloured block at the top of a card.
// With a real image: the WHOLE image is shown (never cropped) over a blurred copy of itself,
// so flyers with text and photos of any shape both fit the container neatly.
// Without an image (or if it fails to load): a gradient with the event title, like the Figma designs.
export function poster(event, ...overlays) {
    const gradient = 'g' + (1 + [...event.id].reduce((n, c) => n + c.charCodeAt(0), 0) % 3);
    const el = h('div', { class: `poster ${gradient}` });
    const showTitle = () => {
        el.classList.remove('has-image');
        el.querySelectorAll('img').forEach(i => i.remove());
        el.prepend(h('div', { class: 'poster-title' }, event.title));
    };
    if (event.image_url) {
        el.classList.add('has-image');
        const backdrop = h('img', { class: 'bg', src: event.image_url, alt: '', 'aria-hidden': 'true', loading: 'lazy' });
        const front = h('img', { class: 'fg', src: event.image_url, alt: '', loading: 'lazy' });
        front.addEventListener('error', showTitle);
        el.append(backdrop, front);
    } else {
        el.append(h('div', { class: 'poster-title' }, event.title));
    }
    el.append(...overlays.filter(Boolean)); // skip empty overlays (false/undefined would be drawn as text)
    return el;
}
