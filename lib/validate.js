// Small input checks, kept in one place so every route validates the same way.
export const MAX_COMMENT_LENGTH = 500;

// Returns { text } when the comment is valid, or { error } with a friendly message.
export function checkCommentText(value) {
    if (typeof value !== 'string') return { error: 'comment_text must be text.' };
    const text = value.trim();
    if (text.length === 0) return { error: 'Please write something before posting.' };
    if (text.length > MAX_COMMENT_LENGTH) {
        return { error: `Comments can be at most ${MAX_COMMENT_LENGTH} characters.` };
    }
    return { text };
}
