// How a comment's author appears to other people. If someone turned off
// "Show my name on comments", others see "Anonymous" (they still see their own name).
export function authorOf(user, isMine) {
    if (!user) return { name: 'Unknown', initials: '?', role: 'student', avatar_color: '#6B7280' };
    if (user.show_name_on_comments === false && !isMine) {
        return { name: 'Anonymous', initials: '?', role: user.role, avatar_color: '#6B7280' };
    }
    return { name: user.name, initials: user.initials, role: user.role, avatar_color: user.avatar_color };
}

// "S. Rivera" -> "SR", "Mikaela Olarte" -> "MO"
export function initialsOf(name) {
    const parts = name.replace(/\./g, ' ').split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    const first = parts[0][0], last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
}
