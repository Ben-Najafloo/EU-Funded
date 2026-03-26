import { useState, useEffect, useRef, useContext } from 'react';
import { commonWords } from '../assets/englishWords'
import { SearchContext } from '../contexts/SearchContext';

export const useSuggestionWord = () => {

    const {
        searchTerm,
        setSearchTerm
    } = useContext(SearchContext);


    const [misspelledWords, setMisspelledWords] = useState([]);
    const [suggestions, setSuggestions] = useState({});

    const spellCheckDebounceRef = useRef(null);

    // Convert imported words to Set for faster lookup
    const wordSet = useRef(new Set(commonWords.map(w => w.toLowerCase())));

    const levenshteinDistance = (str1, str2) => {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + 1,
                        dp[i][j - 1] + 1,
                        dp[i - 1][j] + 1
                    );
                }
            }
        }

        return dp[m][n];
    };

    // Get suggestions for a misspelled word
    const getSuggestions = (word) => {
        const wordLower = word.toLowerCase();
        const suggestions = [];

        // Find words with small edit distance
        for (let dictWord of wordSet.current) {
            const distance = levenshteinDistance(wordLower, dictWord);
            if (distance <= 2 && distance > 0) {
                suggestions.push({ word: dictWord, distance });
            }
        }

        // Sort by distance and return top 3
        return suggestions
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 3)
            .map(s => s.word);
    };

    // Spell check functionality - OPTIMIZED
    useEffect(() => {
        if (spellCheckDebounceRef.current) clearTimeout(spellCheckDebounceRef.current);

        if (!searchTerm.trim()) {
            setMisspelledWords([]);
            setSuggestions({});
            return;
        }

        // INCREASED delay to avoid competing with search
        spellCheckDebounceRef.current = setTimeout(() => {
            const words = searchTerm.match(/\b[a-zA-Z]+\b/g) || [];
            const misspelled = [];
            const newSuggestions = {};

            words.forEach(word => {
                const wordLower = word.toLowerCase();
                // Skip very short words (1-2 chars) and already checked words
                if (word.length <= 2) return;

                if (!wordSet.current.has(wordLower) && !misspelled.includes(wordLower)) {
                    misspelled.push(wordLower);
                    const wordSuggestions = getSuggestions(word);
                    if (wordSuggestions.length > 0) {
                        newSuggestions[wordLower] = wordSuggestions;
                    }
                }
            });

            setMisspelledWords(misspelled);
            setSuggestions(newSuggestions);
        }, 1000); // Increased from 500ms to 1000ms to avoid interference

        return () => clearTimeout(spellCheckDebounceRef.current);
    }, [searchTerm]);

    // Handle suggestion click - replace misspelled word with suggestion
    const handleSuggestionClick = (misspelledWord, suggestion) => {
        const regex = new RegExp(`\\b${misspelledWord}\\b`, 'gi');
        const newText = searchTerm.replace(regex, suggestion);
        setSearchTerm(newText);
        // navigate('/');
    };

    return {
        misspelledWords, suggestions, handleSuggestionClick, spellCheckDebounceRef
    }
}


