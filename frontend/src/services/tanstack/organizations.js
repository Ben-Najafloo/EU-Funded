//src/services/tanstack/organizations.jsx
import axios from 'axios';

const userClient = axios.create({
    baseURL: (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/organizations'
});

// Get organization info with id
export const getOrganization = async (id) => {
    try {
        const response = await userClient.get(`/${id}`);
        if (!response.data) {
            const error = new Error('No data returned from API');
            throw error;
        }
        return response.data;
    } catch (error) {
        console.error('Error in getOrganization:', error);
        throw error;
    }
};


// Get all projects for an organization with role filtering
export const getProjects = async (id, { role = "" } = {}) => {

    try {
        const response = await userClient.get(`/${id}/projects?role=${role}`);

        if (!response.data) {
            const error = new Error('No data returned from API');
            throw error;
        }

        return response.data;
    } catch (error) {
        console.error('Error in getProjects:', error);
        throw error;
    }
};