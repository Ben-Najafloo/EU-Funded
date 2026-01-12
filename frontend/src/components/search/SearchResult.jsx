import React, { useState } from 'react';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useProjectExport } from '../../hooks/useProjectExport';
import ActionMenu from '../project-details/ActionMenu';
import DownloadProject from '../project-details/DownloadProject';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const SearchResult = ({ projectList, fromSearch }) => {
    const { isDark } = useTheme();
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'success' });

    // Use export hook only when fromSearch is true
    const {
        selectedProjectIds,
        toggleProjectSelection,
        toggleSelectAll,
        clearSelection,
        isProjectSelected,
        exportSelectedProjects,
    } = useProjectExport();

    // Export handler
    const handleExportSelected = () => {
        exportSelectedProjects(
            projectList,
            (count) => {
                setAlertInfo({ open: true, message: `Successfully exported ${count} project(s)` });
                // You can also show a toast/notification here
                console.log(`Successfully exported ${count} project(s)`);
            },
            (errorMsg) => {
                setAlertInfo({ open: true, message: errorMsg, severity: 'warning' });
                console.error(errorMsg);
            }
        );
    };

    return (
        <div>
            {/* Selection Controls - Only show when fromSearch is true */}
            {fromSearch && projectList.length > 0 && (
                <div className='flex flex-wrap gap-x-3 items-center my-4 ml-1'>
                    <button
                        onClick={() => toggleSelectAll(projectList)}
                        className='px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition'
                    >
                        {selectedProjectIds.length === projectList.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {/* <span className='text-sm text-gray-600 dark:text-gray-300'>
                        {selectedProjectIds.length} selected
                    </span> */}
                    {selectedProjectIds.length > 0 && (
                        <>
                            <button
                                onClick={handleExportSelected}
                                className='px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition flex items-center gap-2'
                            >
                                <FileDownloadIcon fontSize='small' />
                                Export Selected ({selectedProjectIds.length})
                            </button>
                            <button
                                onClick={clearSelection}
                                className='px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition'
                            >
                                Clear Selection
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Project List */}
            <ul>
                {projectList.map((proj) => (
                    <li key={proj.id} className='my-4 ml-1 shadow-lg'>
                        <Card variant="outlined"
                            sx={{ backgroundColor: isDark ? '#1f2937' : '#ffffff' }}>
                            <Box sx={{ p: 2 }}>
                                <Stack
                                    direction="row"
                                    sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                                >
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        {/* Checkbox - Only show when fromSearch is true */}
                                        {fromSearch && (
                                            <Checkbox
                                                checked={isProjectSelected(proj.id)}
                                                onChange={() => toggleProjectSelection(proj.id)}
                                                sx={{
                                                    color: isDark ? '#9ca3af' : '#6b7280',
                                                    '&.Mui-checked': {
                                                        color: '#3b82f6',
                                                    },
                                                }}
                                            />
                                        )}
                                        <Typography
                                            gutterBottom
                                            variant="body2"
                                            component="div"
                                            sx={{ color: isDark ? '#e5e7eb' : 'text.primary', marginBottom: '10px' }}>
                                            <span className='text-xs px-2 text-white py-1 rounded bg-gray-500'>ID: {proj.id}</span>
                                            {proj.status === "SIGNED" ? (
                                                <span className='text-xs px-2 text-white py-1 rounded ml-2 bg-green-500'>{proj.status}</span>
                                            ) : proj.status === "CLOSED" ? (
                                                <span className='text-xs px-2 text-white py-1 rounded ml-2 bg-red-500'>{proj.status}</span>
                                            ) : (
                                                <span className='text-xs px-2 text-white py-1 rounded ml-2 bg-gray-500'>{proj.status}</span>
                                            )}
                                        </Typography>
                                    </Stack>
                                    {fromSearch && (
                                        <Typography gutterBottom variant="body2" component="div"
                                            sx={{ color: isDark ? '#e5e7eb' : 'text.primary' }}>
                                            <span className='m-2'>Search Score: {proj.finalScore?.toFixed(2)}</span>
                                        </Typography>
                                    )}
                                </Stack>

                                <Link
                                    to={`/project/${proj.id}`}
                                    state={{ project: proj, similars: projectList }}
                                >
                                    <Typography gutterBottom variant="body2" component="div"
                                        sx={{ color: 'blue', ml: fromSearch ? 6 : 0 }}>
                                        {proj.acronym}
                                    </Typography>
                                    <Typography
                                        sx={{
                                            color: isDark ? '#e5e7eb' : 'text.primary',
                                            paddingRight: fromSearch ? '9rem' : '0rem',
                                            fontSize: fromSearch ? '1.4rem' : '0.9rem',
                                            ml: fromSearch ? 6 : 0
                                        }}>
                                        {proj.title}
                                    </Typography>
                                </Link>
                            </Box>
                            <Divider />
                            <Stack
                                direction="row"
                                sx={{ justifyContent: 'space-between', alignItems: 'center' }}
                            >
                                {fromSearch && proj.keywords ? (
                                    <Box sx={{ p: 1 }}>
                                        <Stack direction="row" spacing={1} flexWrap="wrap">
                                            {proj.keywords?.split(", ").map((keyw, index) => (
                                                <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                    {keyw}
                                                </span>
                                            ))}
                                        </Stack>
                                    </Box>
                                ) : (
                                    <span className="ml-2 inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                                        No Keywords
                                    </span>
                                )}
                                <div className='flex'>
                                    <ActionMenu fromSearchAndResult={true} id={proj.id} />
                                    <DownloadProject fromSearchAndResult={true} project={proj} />
                                </div>
                            </Stack>
                        </Card>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default SearchResult;