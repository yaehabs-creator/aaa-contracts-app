/**
 * PostgreSQL jsonb does not support the null character (\u0000) in strings.
 * This utility removes or replaces them to prevent database insert failures.
 */
export function cleanNullBytes<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;

    try {
        // Stringify, remove escaped null sequences, and parse back
        const jsonString = JSON.stringify(obj);
        // Remove both \\u0000 (escaped) and literal null characters if somehow present
        const cleanedString = jsonString.replace(/\\u0000/g, '');
        return JSON.parse(cleanedString);
    } catch (error) {
        console.warn('Failed to clean null bytes from JSON:', error);
        return obj;
    }
}
