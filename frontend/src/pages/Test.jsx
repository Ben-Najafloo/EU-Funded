import { useState, useEffect } from 'react';
import { commonWords } from '../assets/englishWords';

const Test = () => {
    const [text, setText] = useState('');
    const [misspelledWords, setMisspelledWords] = useState([]);
    const [suggestions, setSuggestions] = useState({});

    // Calculate Levenshtein distance for suggestions
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
        for (let dictWord of commonWords) {
            const distance = levenshteinDistance(wordLower, dictWord);
            if (distance <= 2 && distance > 0) {
                suggestions.push({ word: dictWord, distance });
            }
        }

        // Sort by distance and return top 5
        return suggestions
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 5)
            .map(s => s.word);
    };

    // Check spelling when text changes
    useEffect(() => {
        if (!text.trim()) {
            setMisspelledWords([]);
            setSuggestions({});
            return;
        }

        const words = text.match(/\b[a-zA-Z]+\b/g) || [];
        const misspelled = [];
        const newSuggestions = {};

        words.forEach(word => {
            const wordLower = word.toLowerCase();
            if (!commonWords.has(wordLower) && !misspelled.includes(wordLower)) {
                misspelled.push(wordLower);
                const wordSuggestions = getSuggestions(word);
                if (wordSuggestions.length > 0) {
                    newSuggestions[wordLower] = wordSuggestions;
                }
            }
        });

        setMisspelledWords(misspelled);
        setSuggestions(newSuggestions);
    }, [text]);

    const handleSuggestionClick = (misspelledWord, suggestion) => {
        const regex = new RegExp(`\\b${misspelledWord}\\b`, 'gi');
        const newText = text.replace(regex, suggestion);
        setText(newText);
    };

    const highlightMisspelledWords = () => {
        if (!text) return null;

        const parts = [];
        let lastIndex = 0;
        const regex = /\b[a-zA-Z]+\b/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const word = match[0];
            const wordStart = match.index;

            if (wordStart > lastIndex) {
                parts.push(text.substring(lastIndex, wordStart));
            }

            if (misspelledWords.includes(word.toLowerCase())) {
                parts.push(
                    <span key={wordStart} className="bg-red-200 border-b-2 border-red-500 rounded-sm px-0.5">
                        {word}
                    </span>
                );
            } else {
                parts.push(word);
            }

            lastIndex = wordStart + word.length;
        }

        if (lastIndex < text.length) {
            parts.push(text.substring(lastIndex));
        }

        return parts;
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8 pt-32">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg py-2 px-5 mb-4">

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter your text:
                        </label>
                        <div className="relative">
                            <div className="absolute inset-0 p-3 pointer-events-none whitespace-pre-wrap break-words font-mono text-transparent">
                                {highlightMisspelledWords()}
                            </div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Try typing: Magellan is a gooth compani..."
                                className="w-full h-20 p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none font-mono bg-transparent relative resize-none"
                                style={{ caretColor: 'black' }}
                            />
                        </div>

                        {misspelledWords.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">

                                <span>{misspelledWords.length} misspelled word{misspelledWords.length > 1 ? 's' : ''} detected</span>
                            </div>
                        )}
                    </div>
                </div>

                {misspelledWords.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Suggestions:</h2>
                        <div className="space-y-4">
                            {misspelledWords.map(word => (
                                <div key={word} className="pl-4 py-1 flex">
                                    <div className="flex items-center gap-x-2">
                                        <span className="font-semibold text-red-600">{word}</span>
                                        <span className="text-gray-400">→</span>
                                    </div>
                                    {suggestions[word] && suggestions[word].length > 0 ? (
                                        <div className="flex flex-wrap gap-x-2">
                                            {suggestions[word].map((suggestion, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => handleSuggestionClick(word, suggestion)}
                                                    className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm hover:bg-indigo-200 transition-colors"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 text-sm">No suggestions available, Maybe this a name</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {text && misspelledWords.length === 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-2 text-green-600">

                            <span className="font-semibold">All words are spelled correctly!</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Test;

// import { DataGridPro } from '@mui/x-data-grid-pro';
// import { useMockServer } from '@mui/x-data-grid-generator';

// function Test() {
//     const { fetchRows, editRow, ...props } = useMockServer(
//         { rowLength: 100000, editable: true },
//         { useCursorPagination: false, minDelay: 200, maxDelay: 500 },
//     );

//     const dataSource = React.useMemo(
//         () => ({
//             getRows: async (params) => {
//                 const urlParams = new URLSearchParams({
//                     filterModel: JSON.stringify(params.filterModel),
//                     sortModel: JSON.stringify(params.sortModel),
//                     start: `${params.start}`,
//                     end: `${params.end}`,
//                 });
//                 const getRowsResponse = await fetchRows(
//                     `https://mui.com/x/api/data-grid?${urlParams.toString()}`,
//                 );

//                 return {
//                     rows: getRowsResponse.rows,
//                     rowCount: getRowsResponse.rowCount,
//                 };
//             },
//             updateRow: async (params) => {
//                 const syncedRow = await editRow(params.rowId, params.updatedRow);
//                 return syncedRow;
//             },
//         }),
//         [fetchRows, editRow],
//     );

//     return (
//         <div style={{ width: '100%', height: 400 }}>
//             <DataGridPro
//                 {...props}
//                 dataSource={dataSource}
//                 lazyLoading
//                 paginationModel={{ page: 0, pageSize: 10 }}
//             />
//         </div>
//     );
// }

// export default Test;



