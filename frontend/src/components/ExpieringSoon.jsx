import React from 'react';
import Cards from './Cards';
import HourglassDisabledIcon from '@mui/icons-material/HourglassDisabled';
import { WillExpiredProjects } from '../services/api';
import { useQuery } from '@tanstack/react-query';

const ExpieringSoon = ({ all }) => {

    const { data, isPending } = useQuery({
        queryKey: ['expiringSoon'],
        queryFn: WillExpiredProjects,
        staleTime: 1000 * 60 * 5
    })

    if (isPending) {
        return (
            <div className='pt-32 min-h-screen'>
                <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'><HourglassDisabledIcon className='mr-3 mb-1' /> Expiring Soon:</h1>
                <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300">
                    Loading Projects...
                </p>
            </div>
        );
    }

    return (
        <div className='mt-20'>
            <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'><HourglassDisabledIcon className='mr-3 mb-1' /> Expiring Soon:</h1>
            <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300 lg:mb-8 md:text-lg lg:text-xl 400"> The projects ending in up comming months</p>
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

export default ExpieringSoon
