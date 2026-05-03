import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { addFavorite as addFavoriteApi, removeFavorite as removeFavoriteApi } from '../services/userApi';
import { getFavorites } from '../services/tanstack/http';

export const useFavorites = () => {
    const { getToken, isSignedIn } = useAuth();
    const queryClient = useQueryClient();

    const { data: favorites = [], isLoading: loading } = useQuery({
        queryKey: ['favorites'],
        queryFn: () => getFavorites(getToken),
        enabled: isSignedIn,
        staleTime: 1000 * 60 * 5,
    });

    const { mutate: addFav } = useMutation({
        mutationFn: (projectId) => addFavoriteApi(getToken, projectId),
        onMutate: async (projectId) => {
            await queryClient.cancelQueries({ queryKey: ['favorites'] });
            const previous = queryClient.getQueryData(['favorites']);
            queryClient.setQueryData(['favorites'], (old = []) => [...old, projectId]);
            return { previous };
        },
        onError: (_err, _id, ctx) => {
            queryClient.setQueryData(['favorites'], ctx.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    const { mutate: removeFav } = useMutation({
        mutationFn: (projectId) => removeFavoriteApi(getToken, projectId),
        onMutate: async (projectId) => {
            await queryClient.cancelQueries({ queryKey: ['favorites'] });
            const previous = queryClient.getQueryData(['favorites']);
            queryClient.setQueryData(['favorites'], (old = []) => old.filter(id => id !== projectId));
            return { previous };
        },
        onError: (_err, _id, ctx) => {
            queryClient.setQueryData(['favorites'], ctx.previous);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['favorites'] });
        },
    });

    const isFavorite = (projectId) => favorites.includes(projectId);

    const addFavorite = async (projectId) => {
        if (!isSignedIn) throw new Error('User must be signed in');
        addFav(projectId);
    };

    const removeFavorite = async (projectId) => {
        if (!isSignedIn) throw new Error('User must be signed in');
        removeFav(projectId);
    };

    const toggleFavorite = async (projectId) => {
        if (isFavorite(projectId)) {
            removeFavorite(projectId);
        } else {
            addFavorite(projectId);
        }
    };

    return {
        favorites,
        loading,
        isFavorite,
        addFavorite,
        removeFavorite,
        toggleFavorite,
    };
};