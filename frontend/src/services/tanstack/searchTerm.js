// src/services/tanstack/searchTerm.jsx
import axios from 'axios';

const searchClient = axios.create({
    baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/gemini',
    timeout: 10000 // 10 second timeout
});

// Get Gemini Search Term
export const getGeminiSearchTerm = async (imperfect_search_term) => {
    if (!imperfect_search_term || imperfect_search_term.trim().length === 0) {
        throw new Error('Search term cannot be empty');
    }

    try {
        const response = await searchClient.post('/gemini-search-term', {
            imperfect_search_term: imperfect_search_term.trim()
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.data) {
            throw new Error('No data returned from API');
        }

        if (response.data.status === 'error') {
            throw new Error(response.data.message || 'API returned an error');
        }

        return response.data;

    } catch (error) {
        console.error('Error in getGeminiSearchTerm:', error);

        // Provide user-friendly error messages
        if (error.response) {
            throw new Error(error.response.data?.message || 'Server error occurred');
        } else if (error.request) {
            throw new Error('No response from server. Please check your connection.');
        } else {
            throw error;
        }
    }
};