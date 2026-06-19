export function getFirstName(user) {
    const displayName = user?.displayName?.trim();

    if (!displayName) return "";

    return displayName.split(/\s+/)[0];
}
