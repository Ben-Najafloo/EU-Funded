import { useQuery } from '@tanstack/react-query';
import React, { useState, useEffect } from 'react';
import { ClockLoader } from 'react-spinners';
import { useTheme } from '../../contexts/ThemeContext';
import { getGeminiSearchTerm } from '../../services/tanstack/searchTerm';
import { AnimatePresence, motion } from "framer-motion";
import { IoMdClose } from "react-icons/io";
import { FiCopy, FiCheck } from "react-icons/fi";

const SearchTermCreator = ({ setKeywordMakerVisible, keywordMakerVisible }) => {
    const [searchInput, setSearchInput] = useState("");
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
    const [copied, setCopied] = useState(false);
    const { isDark } = useTheme();

    // Debounce search input to avoid excessive API calls
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchInput);
        }, 800);

        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
    };

    const handleCopyKeywords = async () => {
        if (data?.search_term) {
            try {
                await navigator.clipboard.writeText(data.search_term);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    const { data, isError, error, isPending, isFetching } = useQuery({
        queryKey: ['getGeminiSearchTerm', debouncedSearchTerm],
        queryFn: () => getGeminiSearchTerm(debouncedSearchTerm),
        enabled: debouncedSearchTerm.trim().length > 0,
        staleTime: 1000 * 60 * 5,
        retry: 1
    });

    return (
        <AnimatePresence initial={false}>
            {keywordMakerVisible && (
                <motion.div
                    initial={{ opacity: 0, x: 300 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 300 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="bg-white dark:bg-black px-5 py-5 fixed border-l border-gray-200 dark:border-gray-700 top-0 right-0 lg:w-[420px] w-full h-screen m-auto z-50 overflow-y-auto shadow-xl"
                    key="box"
                >
                    <div className='flex justify-between items-center mb-4'>
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                            Keyword Generator
                        </h2>
                        <button
                            className="text-gray-500 dark:text-gray-200 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 p-1 transition-colors"
                            onClick={() => setKeywordMakerVisible(false)}
                        >
                            <IoMdClose size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto">
                        <div className={`min-h-72 rounded-lg border p-6 ${isDark
                            ? 'bg-gray-800 border-gray-700'
                            : 'bg-white border-gray-200'
                            }`}>

                            <div className="mb-6">
                                <label
                                    htmlFor="search-input"
                                    className={`block mb-2 text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}
                                >
                                    Enter your search query
                                </label>
                                <textarea
                                    id="search-input"
                                    onChange={handleSearchChange}
                                    value={searchInput}
                                    placeholder="e.g., hello give me information about AI and Machine Learning"
                                    className="bg-gray-50 h-48 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 w-full p-3 transition-colors resize-none"
                                />
                                {isFetching && (
                                    <p className="mt-2 text-sm text-blue-500 dark:text-blue-400">
                                        Generating keywords...
                                    </p>
                                )}
                            </div>

                            {isPending && debouncedSearchTerm ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <ClockLoader color={isDark ? '#9CA3AF' : '#6B7280'} size={40} />
                                    <p className="text-gray-500 dark:text-gray-400">
                                        Analyzing your query...
                                    </p>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-red-500 text-center">
                                        {error?.message || 'Failed to generate keywords'}
                                    </p>
                                </div>
                            ) : data?.status === 'success' ? (
                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className={`text-lg  ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                            Generated Keywords:
                                        </h3>
                                        <button
                                            onClick={handleCopyKeywords}
                                            className={`flex items-center gap-2  text-sm font-medium transition-all ${copied
                                                ? 'text-green-700 dark:text-green-300'
                                                : 'text-blue-500 dark:text-blue-300 hover:text-blue-700'
                                                }`}
                                        >
                                            {copied ? (
                                                <>
                                                    <FiCheck size={16} />

                                                </>
                                            ) : (
                                                <>
                                                    <FiCopy size={16} />

                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {data.search_term.split(' ').map((keyword, index) => (
                                            <span
                                                key={index}
                                                className="px-4 py-1.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
                                            >
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full gap-3">
                                    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <p className="text-gray-500 dark:text-gray-400 text-center">
                                        Type a search query to generate keywords
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-8 space-y-2">
                        <button
                            className="w-full py-2.5 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-md transition-colors"
                            onClick={() => setKeywordMakerVisible(false)}
                        >
                            Close
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SearchTermCreator;