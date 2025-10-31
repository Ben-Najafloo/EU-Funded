import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { deleteAllFavorites, removeFavorite } from '../services/userApi';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useTheme } from '../contexts/ThemeContext';

import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { FaClock } from 'react-icons/fa';
import AlertComp from './AlertComp';
import AlertDialog from './AlertDialog';
import { getFavorites } from '../services/tanstack/http';


import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

const FavoriteProjects = () => {
    const { getToken, isSignedIn } = useAuth();
    const { isDark } = useTheme();
    const navigate = useNavigate();

    const queryClient = useQueryClient();

    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('recent');
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [alertInfo, setAlertInfo] = useState({ open: false, message: '', severity: 'success' });
    const [open, setOpen] = useState(false);

    const { data: favoriteProjects = [], isPending, isError, error } = useQuery({
        queryKey: ['favorite'],
        queryFn: () => getFavorites(getToken),
        enabled: isSignedIn,
        staleTime: 1000 * 60 * 5,
    });

    const handleClose = () => {
        setOpen(false);
    };

    const handleDialogAlert = () => {
        setOpen(true);
    };

    const handleDeleteAll = async () => {
        try {
            await deleteAllFavorites(getToken);
            queryClient.invalidateQueries(['favorite']);
            handleClose();
            setAlertInfo({ open: true, message: 'All favorite deleted' });
        } catch (err) {
            console.error('Failed to delete favorite:', err);
            setAlertInfo({ open: true, message: 'Failed to delete favorite', severity: 'warning' });
        }
    };

    const handleDeleteItem = async (projectId) => {
        try {
            await removeFavorite(getToken, projectId);
            queryClient.invalidateQueries(['favorite']);
            handleCloseMenu();
            setAlertInfo({ open: true, message: 'Removed from favorite' });
        } catch (err) {
            console.error('Failed to delete favorite item:', err);
            setAlertInfo({ open: true, message: 'Failed to remove from favorite', severity: 'warning' });
        }
    };

    const handleShare = (project) => {
        const url = `${window.location.origin}/project/${project.id}`;
        navigator.clipboard.writeText(url);
        handleCloseMenu();
        setAlertInfo({ open: true, message: 'Link copied to clipboard!' });
    };

    const handleOpenMenu = (event, project) => {
        setAnchorEl(event.currentTarget);
        setSelectedProject(project);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedProject(null);
    };

    const handleProjectClick = (projectId) => {
        navigate(`/project/${projectId}`);
    };

    const filteredfavorites = favoriteProjects
        .filter(project => {
            if (!searchTerm) return true;
            const search = searchTerm.toLowerCase();
            return (
                project.title?.toLowerCase().includes(search) ||
                project.acronym?.toLowerCase().includes(search) ||
                project.id?.toLowerCase().includes(search)
            );
        })
        .sort((a, b) => {
            if (sortOrder === 'recent') {
                return new Date(b.openedAt) - new Date(a.openedAt);
            } else {
                return new Date(a.openedAt) - new Date(b.openedAt);
            }
        });

    if (isError) {
        return (
            <div className='pt-32 min-h-screen'>
                <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'>
                    <FavoriteIcon className='mr-3 mb-1' />Your Favorite Projects
                </h1>
                <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300">
                    {error.message || 'There is a problem...'}
                </p>
            </div>
        );
    }

    if (isPending) {
        return (
            <div className='pt-32 min-h-screen'>
                <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'>
                    <FavoriteIcon className='mr-3 mb-1' />Your Favorite Projects
                </h1>
                <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300">
                    Loading your favorite...
                </p>
            </div>
        );
    }

    return (
        <div className='pt-32 min-h-screen px-4'>
            <AlertComp alertInfo={alertInfo} setAlertInfo={setAlertInfo} />
            <AlertDialog handleDeleteAll={handleDeleteAll} open={open} handleClose={handleClose} />
            <div className='mb-6'>
                <h1 className='text-3xl mb-2 dark:text-gray-200 text-gray-800'>
                    <FavoriteIcon className='mr-3 mb-1' />Your Favorite Projects
                </h1>
                <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300 mb-4">
                    {favoriteProjects.length} project{favoriteProjects.length !== 1 ? 's' : ''} Favorite
                </p>

                {/* Header Controls */}
                <div className='flex flex-wrap gap-4 items-center mb-4'>
                    <input
                        type="text"
                        placeholder="Search by title, acronym, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='flex-1 min-w-[250px] px-4 py-2 border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600'
                    />
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className='px-4 py-2 text-sm border rounded dark:bg-gray-800 dark:text-white dark:border-gray-600'
                    >
                        <option value="recent">Most Recent</option>
                        <option value="oldest">Oldest First</option>
                    </select>
                    <button
                        onClick={handleDialogAlert}
                        disabled={favoriteProjects.length === 0}
                        className='px-4 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2'
                    >
                        <DeleteIcon fontSize='small' />
                        Delete All
                    </button>
                </div>
            </div>

            {/* Table */}
            {filteredfavorites.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No projects match your search' : 'No favorite yet'}
                </p>
            ) : (
                <ul>
                    {filteredfavorites.map((project) => (
                        <li key={project.id} className='my-4 shadow-lg'>
                            <div>
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
                                                <span className='text-xs px-2 text-white py-1 rounded bg-gray-500'>ID: {project.id}</span>
                                            </Typography>
                                            <IconButton onClick={(e) => handleOpenMenu(e, project)} size='small'>
                                                <MoreVertIcon className='dark:text-white' />
                                            </IconButton>

                                        </Stack>

                                        <Typography gutterBottom variant="body2" component="div"
                                            sx={{ color: 'blue' }}>
                                            {project.acronym}
                                        </Typography>
                                        <Typography variant="h6"
                                            className='hover:text-blue-500 cursor-pointer'
                                            onClick={() => handleProjectClick(project.id)}
                                            sx={{ color: isDark ? '#e5e7eb' : 'text.primary', paddingRight: '9rem' }}>
                                            {project.title}
                                        </Typography>
                                    </Box>
                                    <Divider />
                                </Card>
                            </div>
                        </li>
                    ))}
                </ul >

            )}

            {/* Actions Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                slotProps={{
                    paper: {
                        style: {
                            backgroundColor: isDark ? "#263238" : "white"
                        }
                    }
                }}
            >
                <MenuItem onClick={() => handleDeleteItem(selectedProject?.id)}>
                    <DeleteIcon className='mr-2' fontSize='small' />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Delete</span>
                </MenuItem>

                <MenuItem onClick={() => handleShare(selectedProject)}>
                    <ShareIcon className='mr-2' fontSize='small' />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Share</span>
                </MenuItem>
                <MenuItem onClick={handleCloseMenu}>
                    <FileDownloadIcon className='mr-2' fontSize='small' />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Export (Coming Soon)</span>
                </MenuItem>
            </Menu>
        </div>
    );
};

export default FavoriteProjects;