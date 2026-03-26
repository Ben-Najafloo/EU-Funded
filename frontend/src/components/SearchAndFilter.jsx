import { useState, useEffect, useRef, useContext } from 'react';
import { IoFilter } from "react-icons/io5";

import Filter from './Filter';
import { SearchProjects } from '../services/api';
import { SearchContext } from '../contexts/SearchContext';
import { ClockLoader } from 'react-spinners';

import Button from '@mui/material/Button';

import SearchResult from './search/SearchResult';
import SearchTermCreator from './search/SearchTermCreator';
import { VscRobot } from 'react-icons/vsc';
import { useSuggestionWord } from '../hooks/useSuggestionWord';

const SearchAndFilter = () => {
    const {
        searchTerm,
        setSearchTerm,
        projectList,
        setProjectList,
        setSearchActive,
        searchActive,
        filters,
        setFilters,
        isLoading,
        setIsLoading
    } = useContext(SearchContext);

    // Word Suggestions
    const { misspelledWords, suggestions, handleSuggestionClick, spellCheckDebounceRef } = useSuggestionWord();

    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    const [filterVisible, setFilterVisible] = useState(false);
    const [keywordMakerVisible, setKeywordMakerVisible] = useState(false);

    const debounceRef = useRef(null);
    const abortControllerRef = useRef(null); // NEW: For cancelling requests
    const requestIdRef = useRef(0); // NEW: Track request order


    // Helper function to check if filters are active 
    const hasActiveFilters = (filtersObj) => {
        return Object.values(filtersObj).some(value =>
            value !== undefined && value !== null && value !== ""
        );
    };

    // --- IMPROVED FETCH PROJECTS WITH REQUEST CANCELLATION ---
    const fetchProjects = async (query, pageNumber = 1, append = false) => {
        // Cancel previous request if exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();
        const currentRequestId = ++requestIdRef.current;

        if (append) {
            setLoadingMore(true);
        } else {
            setIsLoading(true);
        }

        try {
            const response = await SearchProjects(
                query,
                pageNumber,
                10,
                filters,
                abortControllerRef.current.signal // Pass abort signal
            );

            // Check if this is still the latest request
            if (currentRequestId !== requestIdRef.current) {
                console.log('Ignoring outdated request');
                return;
            }

            setProjectList(prev =>
                append ? [...prev, ...response.projects] : response.projects
            );
            setHasMore(pageNumber < response.pages);
            setPage(pageNumber);

        } catch (error) {
            // Ignore abort errors
            if (error.name === 'AbortError' || error.message === 'canceled') {
                console.log('Request cancelled');
                return;
            }

            // Only handle actual errors
            console.error('Search error:', error);

            // Check if still latest request before updating state
            if (currentRequestId === requestIdRef.current) {
                setProjectList([]);
            }
        } finally {
            // Only update loading state if this is still the latest request
            if (currentRequestId === requestIdRef.current) {
                if (append) {
                    setLoadingMore(false);
                } else {
                    setIsLoading(false);
                }
            }
        }
    };

    // IMPROVED search trigger with longer debounce
    useEffect(() => {
        const trimmedSearchTerm = searchTerm.trim();
        const hasFilters = hasActiveFilters(filters);

        // If there's no search term and no filters, don't search
        if (!trimmedSearchTerm && !hasFilters) {
            if (debounceRef.current) clearTimeout(debounceRef.current);

            // Cancel any pending requests
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            setProjectList([]);
            setHasMore(false);
            setSearchActive(false);
            setIsLoading(false);
            return;
        }

        if (debounceRef.current) clearTimeout(debounceRef.current);

        // Show loading immediately for better UX
        setIsLoading(true);

        debounceRef.current = setTimeout(() => {
            fetchProjects(trimmedSearchTerm, 1, false);
            setSearchActive(true);
        }, 600);

        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, [searchTerm, filters]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
            if (spellCheckDebounceRef.current) {
                clearTimeout(spellCheckDebounceRef.current);
            }
        };
    }, []);

    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setFilterVisible(false);
    };

    const handleLoadMore = async () => {
        const trimmedSearchTerm = searchTerm.trim();
        setLoadingMore(true);

        try {
            await fetchProjects(trimmedSearchTerm, page + 1, true);
        } catch (error) {
            console.error('Load more error:', error);
            setLoadingMore(false);
        }
    };

    // Clear all filters
    const handleClearAllFilters = () => {
        setFilters({});
    };


    return (
        <>
            {/* No results message */}
            {/* {searchTerm.trim() === '' && !hasActiveFilters(filters) && projectList.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-300 ">
                    Enter a search term or apply filters to see results
                </div>
            )} */}

            <div className={`flex items-center mx-auto md:w-full transition-all duration-500 ease-in-out ${searchActive ? 'mt-2' : 'mt-20'}`}>

                <div className="relative w-full">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                        {isLoading && (
                            <ClockLoader className="w-4 h-4 text-gray-500" color="gray" size="30" />
                        )}
                    </div>
                    <input
                        onChange={handleSearchChange}
                        value={searchTerm}
                        type="text"
                        placeholder="Search Projects, Acronyms, Organizations..."
                        className="bg-gray-50 dark:bg-gray-600 border border-gray-300 mr-2 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full ps-10 p-2.5 ml-1"
                    />
                </div>

                <button
                    onClick={() => setKeywordMakerVisible(true)}
                    className="inline-flex items-center py-2.5 px-3  ms-3 text-sm font-medium bg-gray-50 dark:bg-gray-600 border border-gray-300 text-gray-900 dark:text-gray-200 rounded-lg hover:bg-blue-500"
                >
                    <VscRobot className="w-4 h-4 me-2" />
                    Keyword
                </button>

                <button
                    onClick={() => setFilterVisible(true)}
                    className="inline-flex items-center py-2.5 px-3 ms-2 text-sm font-medium bg-gray-50 dark:bg-gray-600 border border-gray-300 text-gray-900 dark:text-gray-200 rounded-lg hover:bg-blue-500"
                >
                    <IoFilter className="w-4 h-4 me-2" />
                    Filter
                </button>
            </div>

            {/* Spell Check Suggestions */}
            {misspelledWords.length > 0 && searchTerm.trim() && (
                <div className="mx-auto md:w-full mt-2 ml-1">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                            💡 Did you mean:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {misspelledWords.map(word => (
                                <div key={word} className="flex items-center gap-2">
                                    <span className="text-xs text-yellow-700 dark:text-yellow-300 font-medium">
                                        {word} →
                                    </span>
                                    {suggestions[word] && suggestions[word].map((suggestion, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSuggestionClick(word, suggestion)}
                                            className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <Filter
                setFilterVisible={setFilterVisible}
                filterVisible={filterVisible}
                onApply={handleApplyFilters}
                currentFilters={filters}
            />

            <SearchTermCreator
                setKeywordMakerVisible={setKeywordMakerVisible}
                keywordMakerVisible={keywordMakerVisible}
            />

            {/* Active Filter Summary */}
            {hasActiveFilters(filters) && (
                <div className="flex flex-wrap gap-2 m-2">
                    {Object.entries(filters)
                        .filter(([_, value]) => value !== undefined && value !== null && value !== "")
                        .map(([key, value]) => (
                            <span
                                key={key}
                                className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded border border-blue-200 flex items-center gap-1"
                            >
                                {key}: {value}
                                <button
                                    onClick={() => {
                                        const newFilters = { ...filters };
                                        delete newFilters[key];
                                        setFilters(newFilters);
                                    }}
                                    className="text-red-500 font-bold text-xs"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    <button
                        onClick={handleClearAllFilters}
                        className="text-red-500 text-xs underline"
                    >
                        Clear All
                    </button>
                </div>
            )}




            {/* Search Results  */}
            <SearchResult projectList={projectList} fromSearch={true} />

            {/* No results found message */}
            {(searchTerm.trim() !== '' || hasActiveFilters(filters)) && projectList.length === 0 && !isLoading && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-300">
                    No projects found matching your criteria
                </div>
            )}

            {/* Pagination / Load More */}
            {hasMore && (
                <div className="flex justify-center my-4">
                    <Button
                        variant="contained"
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? "Loading..." : "Load More"}
                    </Button>
                </div>
            )}
        </>
    );
};

export default SearchAndFilter;