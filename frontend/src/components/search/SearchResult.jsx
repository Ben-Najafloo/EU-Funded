import React from 'react'
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import ActionMenu from '../project-details/ActionMenu';
import DownloadProject from '../project-details/DownloadProject';

const SearchResult = ({ projectList, fromSearch }) => {

    const { isDark } = useTheme();
    return (
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
                                {fromSearch && (
                                    <Typography gutterBottom variant="body2" component="div"
                                        sx={{ color: isDark ? '#e5e7eb' : 'text.primary' }}>
                                        {/* <EmojiEventsIcon fontSize="small" /> */}
                                        <span className='m-2'>Search Score: {proj.finalScore?.toFixed(2)}</span>
                                    </Typography>
                                )}

                            </Stack>

                            <Link
                                to={`/project/${proj.id}`}
                                state={{ project: proj, similars: projectList }}
                            >
                                <Typography gutterBottom variant="body2" component="div"
                                    sx={{ color: 'blue' }}>
                                    {proj.acronym}
                                </Typography>
                                <Typography
                                    sx={{ color: isDark ? '#e5e7eb' : 'text.primary', paddingRight: fromSearch ? '9rem' : '0rem', fontSize: fromSearch ? '1.4rem' : '0.9rem' }}>
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
        </ul >
    )
}

export default SearchResult
