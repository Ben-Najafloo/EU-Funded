import axios from 'axios';

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/'
})


export const SearchProjects = async (query, page = 1, perPage = 10, filters = {}) => {
    const params = {
        q: query,
        page,
        per_page: perPage
    };

    Object.entries(filters).forEach(([key, value]) => {
        if (Array.isArray(value) && value.length > 0) {
            params[key] = value.join(',');
        } else if (value !== undefined && value !== null && value !== '') {
            params[key] = value;
        }
    });

    const res = await client.get('/projects/search', { params });
    return res.data;
};


export const GetProjectById = async (id) => {
    const res = await client.get(`projects/${id}`);
    return res.data;
};


export async function AllProjects() {
    const { data } = await client.get('projects');
    return data;
}

export async function AllTopics() {
    const { data } = await client.get('projects/all_topics');
    return data;
}

export async function RecentProjects() {
    const { data } = await client.get('projects/recent');
    return data;
}

export async function TopTenProjects() {
    const { data } = await client.get('projects/top');
    return data;
}

export async function ExpiredProjects() {
    const { data } = await client.get('projects/closed');
    return data;
}

export async function WillExpiredProjects() {
    const { data } = await client.get('projects/expiring_soon');
    return data;
}

export async function StatisticsSummary() {
    const { data } = await client.get('projects/statistics/summary');
    return data;
}
