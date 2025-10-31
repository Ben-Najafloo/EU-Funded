import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { addFavorite as addFavoriteApi, removeFavorite as removeFavoriteApi } from '../services/userApi';
import { getFavorites } from '../services/tanstack/http';

export const useFavorites = () => {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const { getToken, isSignedIn } = useAuth();

    // Fetch favorites when user signs in
    useEffect(() => {
        if (!isSignedIn) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        const fetchFavorites = async () => {
            try {
                const data = await getFavorites(getToken);
                setFavorites(data);
            } catch (error) {
                console.error('Failed to fetch favorites:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [isSignedIn, getToken]);

    // Check if a project is favorited
    const isFavorite = (projectId) => {
        return favorites.includes(projectId);
    };

    // Add a project to favorites
    const addFavorite = async (projectId) => {
        if (!isSignedIn) {
            throw new Error('User must be signed in');
        }

        try {
            await addFavoriteApi(getToken, projectId);
            setFavorites(prev => [...prev, projectId]);
            return true;
        } catch (error) {
            console.error('Failed to add favorite:', error);
            throw error;
        }
    };

    // Remove a project from favorites
    const removeFavorite = async (projectId) => {
        if (!isSignedIn) {
            throw new Error('User must be signed in');
        }

        try {
            await removeFavoriteApi(getToken, projectId);
            setFavorites(prev => prev.filter(id => id !== projectId));
            return true;
        } catch (error) {
            console.error('Failed to remove favorite:', error);
            throw error;
        }
    };

    // Toggle favorite status
    const toggleFavorite = async (projectId) => {
        if (isFavorite(projectId)) {
            await removeFavorite(projectId);
        } else {
            await addFavorite(projectId);
        }
    };

    return {
        favorites,
        loading,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite
    };
};