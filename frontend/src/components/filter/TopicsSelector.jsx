import { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
// import {AllTopics} from '../../services/api';

const TopicsSelector = ({
    selectedTopics = [],
    onTopicsChange,
    placeholder = "Type to search topics..."
}) => {
    const [topicInput, setTopicInput] = useState('');
    const [topicSuggestions, setTopicSuggestions] = useState([]);
    const { isDark } = useTheme();

    const baseURL = import.meta.env.VITE_API_BASE_URL

    useEffect(() => {
        if (topicInput.length > 2) {
            const fetchTopics = async () => {
                try {
                    const response = await fetch(`${baseURL}/projects/all_topics/search?q=${encodeURIComponent(topicInput)}`);
                    const data = await response.json();
                    setTopicSuggestions(data);
                } catch (error) {
                    console.error('Error fetching topics:', error);
                    setTopicSuggestions([]);
                }
            };

            // Add debounce to avoid too many requests
            const timeoutId = setTimeout(fetchTopics, 300);
            return () => clearTimeout(timeoutId);
        } else {
            setTopicSuggestions([]);
        }
    }, [topicInput]);

    const handleTopicSelect = (topic) => {
        if (!selectedTopics.includes(topic)) {
            const newSelected = [...selectedTopics, topic];
            onTopicsChange(newSelected);
            setTopicInput('');
            setTopicSuggestions([]);
        }
    };

    const removeTopic = (topicToRemove) => {
        const newSelected = selectedTopics.filter(p => p !== topicToRemove);
        onTopicsChange(newSelected);
    };

    const clearAllTopics = () => {
        onTopicsChange([]);
        setTopicInput('');
        setTopicSuggestions([]);
    };

    return (
        <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-200 mb-1">
                Topic
                {selectedTopics.length > 0 && (
                    <button
                        type="button"
                        onClick={clearAllTopics}
                        className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        Clear all
                    </button>
                )}
            </label>

            <div className="relative">
                <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 border bg-white dark:bg-black text-gray-800 dark:text-gray-200 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* Suggestions Dropdown */}
                {topicSuggestions.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {topicSuggestions.map((topic, index) => (
                            <div
                                key={index}
                                onClick={() => handleTopicSelect(topic)}
                                className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                            >
                                {topic}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected topics */}
            {selectedTopics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                    {selectedTopics.map((topic, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full border border-blue-200 dark:border-blue-700"
                        >
                            {topic}
                            <button
                                type="button"
                                onClick={() => removeTopic(topic)}
                                className="ml-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full w-4 h-4 flex items-center justify-center text-blue-600 dark:text-blue-300"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TopicsSelector;