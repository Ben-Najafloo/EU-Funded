
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog"
import { getProjects } from '../../services/tanstack/organizations';
import SearchResult from '../search/SearchResult';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ClockLoader } from 'react-spinners';
import { useTheme } from '../../contexts/ThemeContext';

const OrgProjectsList = ({ orgID, orgName, number, role }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const perPage = 10;

    const { isDark } = useTheme();

    const { data, isPending, isError, error, isFetching } = useQuery({
        queryKey: ['orgProjects', orgID, role, currentPage],
        queryFn: () => getProjects(orgID, { role, page: currentPage, per_page: perPage }),
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        enabled: isOpen, // Only fetch when dialog is open
    });

    const handleOpenChange = (open) => {
        setIsOpen(open);
        if (!open) {
            setCurrentPage(1); // Reset to page 1 when closing
        }
    };

    const totalPages = data?.pages || 0;
    const canGoPrevious = currentPage > 1;
    const canGoNext = currentPage < totalPages;

    return (
        <div className="text-black dark:text-white">
            {/* <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        className="text-black dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900"
                    >
                        {number}
                    </Button>
                </DialogTrigger>
                <DialogContent className={`sm:max-w-4xl max-h-[85vh] flex flex-col ${isDark ? 'bg-black' : 'bg-white'}`}>
                    <div className={`space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
                        <h3 className="text-lg font-bold">
                            {role === "coordinator"
                                ? `${orgName} (As Coordinator)`
                                : `${orgName} (All Projects)`
                            }
                        </h3>
                        {isPending ? (
                            <p className="text-sm ">Please wait it will take just a few seconds...</p>

                        ) : (
                            <p className="text-sm ">
                                Total: {data?.total || 0} projects
                                {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
                            </p>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 border rounded min-h-[400px]">
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
                        ) : data?.projects && data.projects.length > 0 ? (
                            <>
                                <SearchResult projectList={data.projects} fromSearch={false} />
                                {isFetching && (
                                    <div className="text-center py-2 text-sm text-gray-500">
                                        Updating...
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-gray-500">No projects found</p>
                            </div>
                        )}
                    </div>

                    
                    {totalPages > 1 && !isPending && (
                        <div className="flex items-center justify-between border-t pt-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => p - 1)}
                                disabled={!canGoPrevious || isFetching}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Previous
                            </Button>

                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                Page {currentPage} of {totalPages}
                            </span>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={!canGoNext || isFetching}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Close
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog> */}


            {number}



        </div>
    );
};

export default OrgProjectsList;