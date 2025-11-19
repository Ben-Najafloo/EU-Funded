import { useEffect } from 'react';
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "../../contexts/ThemeContext";
import { IoMdClose } from "react-icons/io";
import { useQuery } from "@tanstack/react-query";
import { getPrefers } from "../../services/tanstack/http";
import { useAuth } from "@clerk/clerk-react";
import PreferProjectsEdit from "./PreferProjectsEdit";

const PreferProjects = ({ setPreferVisible, preferVisible }) => {
    const { isDark } = useTheme();
    const { getToken, isSignedIn } = useAuth();

    const { data, isPending, isError, error } = useQuery({
        queryKey: ['prefer'], // Keep consistent
        queryFn: () => getPrefers(getToken),
        enabled: isSignedIn,
        staleTime: 1000 * 60 * 5,
    });

    // Debug log to see data structure
    useEffect(() => {
        if (data) {
            // console.log('Preferences data:', data);
            // console.log('Topics type:', typeof data.topics, 'Value:', data.topics);
            // console.log('Funding types type:', typeof data.funding_types, 'Value:', data.funding_types);
        }
    }, [data]);

    return (
        <div>
            <AnimatePresence initial={false}>
                {preferVisible && (
                    <motion.div
                        initial={{ opacity: 0, x: 300 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 300 }}
                        transition={{ type: "spring", damping: 25 }}
                        className="bg-white dark:bg-black px-5 py-5 fixed border-l border-gray-200 top-0 right-0 lg:w-[420px] w-full h-screen m-auto z-50 overflow-y-auto shadow-xl"
                        key="box"
                    >
                        <div className='flex justify-between items-center mb-4 pb-4 border-b-2 border-gray-700 dark:border-gray-200'>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                                Preferences Config
                            </h2>
                            <button
                                className="text-gray-500 dark:text-gray-200 hover:text-gray-700 rounded-full hover:bg-gray-100"
                                onClick={() => setPreferVisible(false)}
                            >
                                <IoMdClose size={20} />
                            </button>
                        </div>

                        {isPending && (
                            <p className="text-gray-600 dark:text-gray-400">Loading preferences...</p>
                        )}

                        {isError && (
                            <p className="text-red-600 dark:text-red-400">
                                An error occurred: {error.message}
                            </p>
                        )}

                        {data && (
                            <>
                                {/* Display Current Preferences */}
                                <div className="mb-6">
                                    <h3 className="text-base text-gray-800 dark:text-gray-200 mb-2">
                                        Current Topics:
                                    </h3>
                                    {Array.isArray(data.topics) && data.topics.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {data.topics.map((topic, index) => (
                                                <span
                                                    key={`topic-${index}`}
                                                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">No topics set</p>
                                    )}

                                    <h3 className="text-base text-gray-800 dark:text-gray-200 mb-2 mt-4">
                                        Current Funding Types:
                                    </h3>
                                    {Array.isArray(data.funding_types) && data.funding_types.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {data.funding_types.map((type, index) => (
                                                <span
                                                    key={`funding-${index}`}
                                                    className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-sm"
                                                >
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-500 dark:text-gray-400">No funding types set</p>
                                    )}
                                </div>

                                {/* Edit Form */}
                                <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
                                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                        Edit Preferences:
                                    </h3>
                                    <PreferProjectsEdit />
                                </div>
                            </>
                        )}

                        {!data && !isPending && !isError && (
                            <p className="text-gray-600 dark:text-gray-400">No preferences data available.</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PreferProjects;