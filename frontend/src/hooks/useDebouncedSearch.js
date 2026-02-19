import { useState, useEffect, useRef } from 'react';

/**
 * Hook for debounced search input.
 * Returns the raw searchTerm (for input binding) and debouncedTerm (for API calls).
 *
 * @param {number} delay - Debounce delay in milliseconds (default: 300)
 * @returns {{ searchTerm: string, debouncedTerm: string, setSearchTerm: Function }}
 *
 * @example
 * const { searchTerm, debouncedTerm, setSearchTerm } = useDebouncedSearch(400);
 * // Use searchTerm for <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
 * // Use debouncedTerm for API queries: useTeachers({ search: debouncedTerm })
 */
export function useDebouncedSearch(delay = 300) {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedTerm, setDebouncedTerm] = useState('');
    const timerRef = useRef(null);

    useEffect(() => {
        timerRef.current = setTimeout(() => {
            setDebouncedTerm(searchTerm);
        }, delay);

        return () => clearTimeout(timerRef.current);
    }, [searchTerm, delay]);

    return { searchTerm, debouncedTerm, setSearchTerm };
}

export default useDebouncedSearch;
