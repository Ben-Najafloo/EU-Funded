import { authClient as userClient } from './api';

const getAuthHeaders = async (getToken) => {
    const token = await getToken();
    return {
        Authorization: `Bearer ${token}`
    };
};

/**
 * Get current user data
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 */
export const getCurrentUser = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.get('/me', { headers });
    return data;
};


/**
 * Add a project to favorites
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 * @param {string} projectId - Project ID to add
 */
export const addFavorite = async (getToken, projectId) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.post(`/favorites/${projectId}`, {}, { headers });
    return data;
};

/**
 * Remove a project from favorites
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 * @param {string} projectId - Project ID to remove
 */
export const removeFavorite = async (getToken, projectId) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.delete(`/favorites/${projectId}`, { headers });
    return data;
};


/**
 * Add a project to history (track when user views it)
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 * @param {string} projectId - Project ID to track
 */
export const addToHistory = async (getToken, projectId) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.post(`/history/${projectId}`, {}, { headers });
    return data;
};

/**
 * Get user preferences
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 */
export const getPreferences = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.get('/preferences', { headers });
    return data.preferences;
};

/**
 * Update user preferences
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 * @param {Object} preferences - Preferences object to update
 */
export const updatePreferences = async (getToken, preferences) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.put('/preferences', { preferences }, { headers });
    return data;
};

/**
 * Delete all favorites
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 */
export const deleteAllFavorites = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.delete('/favorites', { headers });
    return data;
};

/**
 * Reorder favorites
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 * @param {Array} favorites - New order array of project IDs
 */
export const reorderFavorites = async (getToken, favorites) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.put('/favorites/reorder', { favorites }, { headers });
    return data;
};

/**
 * Delete all history
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 */
export const deleteAllHistory = async (getToken) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.delete('/history', { headers });
    return data;
};

/**
 * Delete a specific project from history
 * @param {Function} getToken - Clerk's getToken function from useAuth()
 * @param {string} projectId - Project ID to remove from history
 */
export const deleteHistoryItem = async (getToken, projectId) => {
    const headers = await getAuthHeaders(getToken);
    const { data } = await userClient.delete(`/history/${projectId}`, { headers });
    return data;
};