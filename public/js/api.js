// Every fetch() call in the app lives here.
import { state } from './state.js';

async function request(path, options = {}) {
    const response = await fetch(`/api${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(state.userId ? { 'X-User-Id': state.userId } : {}),
            ...options.headers,
        },
    });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
}

export const getEvents = () => request('/events');
export const getEvent = (id) => request(`/events/${encodeURIComponent(id)}`);
export const saveEvent = (id) => request(`/me/saves/${encodeURIComponent(id)}`, { method: 'PUT' });
export const unsaveEvent = (id) => request(`/me/saves/${encodeURIComponent(id)}`, { method: 'DELETE' });
export const getMe = () => request('/me');
export const getSaves = () => request('/me/saves');
export const clearPastSaves = () => request('/me/saves?past=true', { method: 'DELETE' });
export const getComments = (eventId, { before, limit } = {}) => {
    const q = new URLSearchParams();
    if (before) q.set('before', before);
    if (limit) q.set('limit', limit);
    return request(`/events/${encodeURIComponent(eventId)}/comments${q.size ? `?${q}` : ''}`);
};
export const postComment = (eventId, comment_text, parent_id) =>
    request(`/events/${encodeURIComponent(eventId)}/comments`, { method: 'POST', body: JSON.stringify({ comment_text, parent_id }) });
export const patchComment = (commentId, comment_text) =>
    request(`/comments/${encodeURIComponent(commentId)}`, { method: 'PATCH', body: JSON.stringify({ comment_text }) });
export const deleteComment = (commentId) => request(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' });
export const getUsers = () => request('/users');
export const patchMe = (changes) => request('/me', { method: 'PATCH', body: JSON.stringify(changes) });
export const getActivity = () => request('/me/activity');
export const markSeen = (eventId) => request(`/me/activity/${encodeURIComponent(eventId)}/seen`, { method: 'PUT' });
export const getNotifications = () => request('/me/notifications');
export const markNotificationsRead = () => request('/me/notifications/read', { method: 'POST' });
export const getSubscriptions = () => request('/me/subscriptions');
export const subscribe = (source) => request(`/me/subscriptions/${encodeURIComponent(source)}`, { method: 'PUT' });
export const unsubscribe = (source) => request(`/me/subscriptions/${encodeURIComponent(source)}`, { method: 'DELETE' });
