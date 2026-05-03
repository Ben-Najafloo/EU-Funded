import { authClient } from '../api';

const getAuthHeaders = async (getToken) => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
};

export const getHistory = async (getToken, limit = 50) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await authClient.get(`/history/projects?limit=${limit}`, { headers });
    if (!data) throw new Error('there is an error from API');
    return data.projects;
};

export const getFavorites = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await authClient.get('/favorite/projects', { headers });
    if (!data) throw new Error('there is an error from API');
    return data.projects;
};

export const getPrefers = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await authClient.get('/preferences', { headers });
    if (!data) throw new Error('there is an error from API');
    return data.preferences;
};

export const editPreferences = async (getToken, preferences) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await authClient.put('/preferences', { preferences }, { headers });
    if (!data?.preferences) throw new Error('Invalid response from server');
    return data.preferences;
};

export const getRecommendedProjects = async (getToken, limit = 20) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await authClient.get('/preferences/recommended-projects', {
        headers,
        params: { limit }
    });
    if (!data) throw new Error('Failed to fetch recommended projects');
    return data.projects;
};