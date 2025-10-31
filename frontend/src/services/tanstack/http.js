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
    console.log('data favorite', data)
    if (!data) {
        console.log('no data favorite')
        const error = new Error('there is an error from API (Tanstack function..)');
        throw error;
    }
    return data.projects;
};