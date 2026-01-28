import { useMutation, useQueryClient } from "@tanstack/react-query";
import { editPreferences } from "../services/tanstack/http";
import { useAuth } from "@clerk/clerk-react";

export const useUpdatePreferences = () => {
    const { getToken } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (preferences) => editPreferences(getToken, preferences),

        onSuccess: (data) => {
            // Invalidate the CORRECT query key
            queryClient.invalidateQueries({ queryKey: ['prefer'] });

            // Update cache optimistically
            queryClient.setQueryData(['prefer'], data);
        },

        onError: (error) => {
            console.error('Failed to update preferences:', error);
        }
    });
};