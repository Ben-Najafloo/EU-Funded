import React from 'react';
import Cards from './Cards';
import NewReleases from '@mui/icons-material/NewReleases';
import { RecentProjects } from '../services/api';
import { useQuery } from '@tanstack/react-query';

const RecentlyAdded = ({ all }) => {
    const { data, isPending } = useQuery({
        queryKey: ['recentProjects'],
        queryFn: RecentProjects,
        staleTime: 1000 * 60 * 5
    })

    if (isPending) {
        return (
            <div className='pt-32 min-h-screen'>
                <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'><NewReleases className='mr-3' /> Recently Added:</h1>
                <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300">
                    Loading Projects...
                </p>
            </div>
        );
    }

    return (
        <div className='mt-20'>
            <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'><NewReleases className='mr-3' /> Recently Added:</h1>
            <p className="max-w-2xl mb-2 font-light text-gray-500 dark:text-gray-300 lg:mb-8 md:text-lg lg:text-xl 400">
                The latest projects entered in the database
            </p>
            <div className="grid gap-x-8 gap-y-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">

                {all ?
                    data.map((project) => (
                        <Cards key={project.id} {...project} link={`/project/${project.id}`} pState={{ project: project }} />
                    ))
                    :
                    data.slice(0, 3).map((project) => (
                        <Cards key={project.id} {...project} link={`/project/${project.id}`} pState={{ project: project }} />
                    ))
                }

            </div>

        </div>
    )
}

export default RecentlyAdded
