import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react'
import { getOrgScrappedInfo } from '../../services/tanstack/organizations';
import { ClockLoader } from 'react-spinners';

import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FcSearch } from 'react-icons/fc';
import { useTheme } from '../../contexts/ThemeContext';


const ScrappedInfo = ({ orgName }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { isDark } = useTheme();

    const { data, isError, error, isPending } = useQuery({
        queryKey: ['getOrgScrappedInfo', orgName],
        queryFn: () => getOrgScrappedInfo(orgName),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        enabled: isOpen, // Only fetch when dialog is open
    });

    const handleOpenChange = (open) => {
        setIsOpen(open);
    };

    return (

        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="text-black dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                    <FcSearch className='mr-2 mt-1' />
                    <span target='blank' href="#" className="block text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-blue-500">
                        More information
                    </span>
                </Button>
            </DialogTrigger>

            <DialogContent className={`flex flex-col ${isDark ? 'bg-black' : 'bg-white'}`}>

                <div className="flex-1 overflow-y-auto p-3">
                    {isPending ? (
                        <div className="flex items-center justify-center h-full">
                            <ClockLoader className="w-4 h-4 text-gray-500" color="gray" size="30" />
                        </div>
                    ) : isError ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-red-500">
                                {error.message || 'Failed to load projects'}
                            </p>
                        </div>
                    ) : data ? (
                        <div className={`${isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                            <tr><td className='w-32'>Type: </td> <td>{data.description ? data.description : ''} </td></tr>
                            <tr><td className='w-32'>Established in:  </td><td>{data.established ? data.established : ''} </td></tr>
                            <tr><td className='w-32'>LinkedIn: </td> <td>{data.linkedin && (
                                <a href={data.linkedin} target='blank' className='hover:text-blue-500'>
                                    {data.linkedin_type == 'search' ? (
                                        <span>Click here to find on LinkedIn</span>
                                    ) : (
                                        <span>LinkedIn Page</span>
                                    )}
                                </a>
                            )} </td></tr>
                            <tr><td className='w-32'>ROR: </td> <td>{data.ror_id && (
                                <a href={data.ror_id} target='blank' className='hover:text-blue-500'>
                                    <span>Click here to find on ROR</span>
                                </a>
                            )} </td></tr>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-gray-500">No info found</p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    )
}

export default ScrappedInfo
