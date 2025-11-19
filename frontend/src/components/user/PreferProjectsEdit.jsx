
//PreferProjectsEdit.jsx
import { useState, useEffect } from 'react';
import { useUpdatePreferences } from './useUpdatePreferences';
import { useQueryClient } from '@tanstack/react-query';


const PreferProjectsEdit = () => {
    const queryClient = useQueryClient();

    // Get existing preferences from cache
    const existingPreferences = queryClient.getQueryData(['prefer']);

    const [formData, setFormData] = useState({
        topics: [],
        funding_types: [],
    });

    const [topicInput, setTopicInput] = useState('');
    const [fundingInput, setFundingInput] = useState('');

    const { mutate: updatePreferences, isPending, isError, error } = useUpdatePreferences();

    // Initialize form with existing data
    useEffect(() => {
        if (existingPreferences) {
            console.log('Existing preferences:', existingPreferences);
            setFormData({
                topics: Array.isArray(existingPreferences.topics) ? existingPreferences.topics : [],
                funding_types: Array.isArray(existingPreferences.funding_types) ? existingPreferences.funding_types : [],
            });
        }
    }, [existingPreferences]);

    const handleSubmit = (e) => {
        e.preventDefault();

        updatePreferences(formData, {
            onSuccess: () => {
                alert('Preferences updated successfully!');
            },
            onError: (err) => {
                alert(`Failed to update: ${err.message}`);
            }
        });
    };

    const addTopic = () => {
        if (topicInput.trim()) {
            setFormData(prev => ({
                ...prev,
                topics: [...prev.topics, topicInput.trim()]
            }));
            setTopicInput('');
        }
    };

    const removeTopic = (index) => {
        setFormData(prev => ({
            ...prev,
            topics: prev.topics.filter((_, i) => i !== index)
        }));
    };

    const addFundingType = () => {
        if (fundingInput.trim()) {
            setFormData(prev => ({
                ...prev,
                funding_types: [...prev.funding_types, fundingInput.trim()]
            }));
            setFundingInput('');
        }
    };

    const removeFundingType = (index) => {
        setFormData(prev => ({
            ...prev,
            funding_types: prev.funding_types.filter((_, i) => i !== index)
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 mt-6">
            {/* Topics Section */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Topics:
                </label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addTopic();
                            }
                        }}
                        placeholder="Add a topic"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                    <button
                        type="button"
                        onClick={addTopic}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.topics.map((topic, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
                        >
                            <span>{topic}</span>
                            <button
                                type="button"
                                onClick={() => removeTopic(index)}
                                className="hover:text-red-600 dark:hover:text-red-400"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Funding Types Section */}
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Funding Types:
                </label>
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={fundingInput}
                        onChange={(e) => setFundingInput(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addFundingType();
                            }
                        }}
                        placeholder="Add a funding type"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    />
                    <button
                        type="button"
                        onClick={addFundingType}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                        Add
                    </button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {formData.funding_types.map((type, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm"
                        >
                            <span>{type}</span>
                            <button
                                type="button"
                                onClick={() => removeFundingType(index)}
                                className="hover:text-red-600 dark:hover:text-red-400"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-md transition-colors"
            >
                {isPending ? 'Saving...' : 'Save Preferences'}
            </button>

            {isError && (
                <div className="p-3 bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 rounded-md">
                    Error: {error?.message || 'Failed to update preferences'}
                </div>
            )}
        </form>
    );
};

export default PreferProjectsEdit;