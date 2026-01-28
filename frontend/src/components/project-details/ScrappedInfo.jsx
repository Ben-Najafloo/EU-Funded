import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { getOrgScrappedInfo } from '../../services/tanstack/organizations';
import { ClockLoader } from 'react-spinners';
import { FiCopy, FiCheck } from "react-icons/fi"; // Added imports

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

const ScrappedInfo = ({ orgName, url }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false); // Added state
    const { isDark } = useTheme();

    const { data, isError, error, isPending } = useQuery({
        queryKey: ['getOrgScrappedInfo', orgName],
        queryFn: () => getOrgScrappedInfo(orgName, url),
        staleTime: 1000 * 60 * 5,
        enabled: isOpen,
    });

    console.log(data)

    // Function to format data into a clean text string
    const handleCopyInfo = async () => {
        if (data) {
            const textToCopy = `
Organization: ${orgName}
Description: ${data.description || 'N/A'}
Established: ${data.established || 'N/A'}
Type: ${data.organization_types.join(', ') || 'N/A'}

Social Media:
- Facebook: ${data.social_media?.facebook || 'N/A'}
- Instagram: ${data.social_media?.instagram || 'N/A'}
- LinkedIn: ${data.social_media?.linkedin || 'N/A'}

Contact Info:
- Phone: ${data.phones?.length > 0 ? data.phones.json(', ') : 'N/A'}
- Email: ${data.emails?.length > 0 ? data.emails.json(', ') : 'N/A'}
            `.trim();

            try {
                await navigator.clipboard.writeText(textToCopy);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    };

    const handleOpenChange = (open) => {
        setIsOpen(open);
    };

    const SocialMedia = ({ title, url, value }) => {
        return (
            <p className="text-sm">{title}:
                <a target='blank'
                    className="text-blue-500 ml-2 hover:text-blue-700 dark:hover:text-blue-300"
                    href={url}>
                    {value}
                </a>
            </p>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="text-black dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900"
                >
                    <FcSearch className='mr-2 mt-1' />
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-blue-500">
                        More information
                    </span>
                </Button>
            </DialogTrigger>

            <DialogContent className={`flex flex-col max-w-md ${isDark ? 'bg-black' : 'bg-white'}`}>

                {/* Header with Copy Button */}
                <div className="flex justify-between items-center border-b pb-2 mb-2">
                    <h2 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Organization Details
                    </h2>
                    {data && !isPending && (
                        <button
                            onClick={handleCopyInfo}
                            className={`flex items-center gap-2 px-8  transition-all ${copied
                                ? 'text-green-600 dark:text-green-300/20'
                                : 'text-blue-500 hover:text-blue-700 dark:hover:text-blue-300'
                                }`}
                            title="Copy to clipboard"
                        >
                            {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                            {/* <span className="text-xs">{copied ? "Copied!" : "Copy info"}</span> */}
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                    {isPending ? (
                        <div className="flex items-center justify-center h-32">
                            <ClockLoader className="text-gray-500" color="gray" size="30" />
                        </div>
                    ) : isError ? (
                        <div className="flex items-center justify-center h-full">
                            <p className="text-red-500">{error.message || 'Failed to load'}</p>
                        </div>
                    ) : data ? (
                        <div className={`${isDark ? 'text-gray-300' : 'text-gray-900'} space-y-4`}>
                            <div>
                                <span className="text-green-500 font-semibold">About the Organization:</span>
                                <p className="mt-1 text-sm">{data.description || 'No description available'}</p>
                            </div>

                            <div className="text-sm space-y-1">
                                <p><strong>Established:</strong> {data.established || 'N/A'}</p>
                                <p>
                                    <strong>Type:</strong> {data.organization_types?.length > 0
                                        ? data.organization_types.join(', ')
                                        : 'N/A'}
                                </p>
                            </div>
                            {!data.social_media?.facebook && !data.social_media?.instagram && !data.social_media?.linkedin ? "" : (
                                <fieldset className="border border-gray-400 p-3 rounded-lg">
                                    <legend className="px-2 text-xs font-bold uppercase">Social Media</legend>
                                    <SocialMedia title="Facebook" url={data.social_media?.facebook} value={data.social_media?.facebook || 'Not Available'} />
                                    <SocialMedia title="Instagram" url={data.social_media?.instagram} value={data.social_media?.instagram || 'Not Available'} />
                                    <SocialMedia title="LinkedIn" url={data.social_media?.linkedin} value={data.social_media?.linkedin || 'Not Available'} />
                                </fieldset>
                            )}

                            {!data.emails?.length > 0 && !data.phones?.length > 0 ? "" : (
                                <fieldset className="border border-gray-400 p-3 rounded-lg">
                                    <legend className="px-2 text-xs font-bold uppercase">Contact Info</legend>
                                    <p className="text-sm">Phone: {data.phones?.length > 0 ? data.phones : 'Not Available'}</p>
                                    <p className="text-sm">Email: {data.emails?.length > 0 ? data.emails : 'Not Available'}</p>
                                </fieldset>
                            )}

                        </div>
                    ) : (
                        <div className="text-center p-5 text-gray-500">No info found</div>
                    )}
                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default ScrappedInfo;