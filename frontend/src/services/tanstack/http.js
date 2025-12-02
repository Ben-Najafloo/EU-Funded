import axios from 'axios';

const userClient = axios.create({
    baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/users'
});

const getAuthHeaders = async (getToken) => {
    const token = await getToken();
    return {
        Authorization: `Bearer ${token}`
    };
};

// Get user's history projects
export const getHistory = async (getToken, limit = 50) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.get(`/history/projects?limit=${limit}`, { headers });
    if (!data) {
        const error = new Error('there is an error from API (Tanstack function..)');
        throw error;
    }
    return data.projects;
};


// Get user's favorite projects
export const getFavorites = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.get('/favorite/projects', { headers });

    if (!data) {
        console.log('no data favorite')
        const error = new Error('there is an error from API (Tanstack function..)');
        throw error;
    }
    return data.projects;
};


// Get user's prefered projects
export const getPrefers = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.get('/preferences', { headers });
    if (!data) {
        console.log('no data for prefer')
        const error = new Error('there is an error from API (Tanstack function..)');
        throw error;
    }
    return data.preferences;
};


// Edit user's prefered projects
export const editPreferences = async (getToken, preferences) => {
    const headers = await getAuthHeaders(getToken);

    // Wrap preferences in the expected structure
    const payload = {
        preferences: preferences
    };

    try {
        const { data } = await userClient.put('/preferences', payload, { headers });

        if (!data || !data.preferences) {
            throw new Error('Invalid response from server');
        }

        return data.preferences;
    } catch (error) {
        console.error('Error updating preferences:', error);
        throw error;
    }
};


// Get recommended projects (simpler version)
export const getRecommendedProjects = async (getToken, limit = 20) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.get('/preferences/recommended-projects', {
        headers,
        params: { limit }
    });

    if (!data) {
        throw new Error('Failed to fetch recommended projects');
    }

    return data.projects;
};