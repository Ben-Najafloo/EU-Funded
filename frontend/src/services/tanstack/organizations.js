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
export const getProjects = async (id, { role = "all", page = 1, per_page = 10 } = {}) => {
    try {
        const response = await userClient.get(`/${id}/projects`, {
            params: {
                role,
                page,
                per_page
            }
        });

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


// Get scrapped data about organization
export const getOrgScrappedInfo = async (name = "", url = "") => {
    try {
        const response = await userClient.post('/info', {
            name: name,
            url: url
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.data) {
            const error = new Error('No data returned from API');
            throw error;
        }
        return response.data.data;
    } catch (error) {
        console.error('Error in getOrgScrappedInfo:', error);
        throw error;
    }
};

