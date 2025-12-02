
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { deleteAllFavorites, removeFavorite } from '../services/userApi';
import FavoriteIcon from '@mui/icons-material/Favorite';
import { useTheme } from '../contexts/ThemeContext';
import { getName } from 'country-list';

import DeleteIcon from '@mui/icons-material/Delete';
import ShareIcon from '@mui/icons-material/Share';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import AlertComp from './AlertComp';
import AlertDialog from './AlertDialog';
import { getFavorites } from '../services/tanstack/http';

import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// CSV Helper Functions
const cleanCSVValue = (value) => {
    if (value === null || value === undefined) return '';

    let stringValue;

    // Handle objects and arrays
    if (typeof value === 'object' || Array.isArray(value)) {
        stringValue = JSON.stringify(value);
    } else {
        stringValue = String(value);
    }

    // Remove line breaks
    stringValue = stringValue.replace(/(\r\n|\n|\r)/gm, ' ');

    // Escape quotes and wrap in quotes if contains comma or quote
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
    }

    return stringValue;
};

const convertToCSV = (data) => {
    // Get objective (handle both full text and summary)
    const objective = data.objective_data?.summary || data.objective || '';

    // Create vertical structure for main project info
    const projectInfo = [
        ['', ''],
        ['Project ID', cleanCSVValue(data.id || data.projectID || data._id)],
        ['Acronym', cleanCSVValue(data.acronym)],
        ['Title', cleanCSVValue(data.title)],
        ['Status', cleanCSVValue(data.status)],
        ['Start Date', cleanCSVValue(data.startDate)],
        ['End Date', cleanCSVValue(data.endDate)],
        ['Signature Date', cleanCSVValue(data.ecSignatureDate)],
        ['Total Cost (EUR)', cleanCSVValue(data.totalCost)],
        ['EU Contribution (EUR)', cleanCSVValue(data.ecMaxContribution || data.eu_contribution || data.ecContribution)],
        ['Topics', cleanCSVValue(data.topics)],
        ['Keywords', cleanCSVValue(data.keywords)],
        ['Objective', cleanCSVValue(objective)],
        ['Coordinator Name', cleanCSVValue(data.coordinator?.name)],
        ['Number of Projects', cleanCSVValue(data.coordinator?.project_count)],
        ['Number of Coordinating', cleanCSVValue(data.coordinator?.coordinator_count)],
        ['Coordinator Country', cleanCSVValue(data.coordinator?.country ? getName(data.coordinator.country) : '')],
        ['Coordinator Organization URL', cleanCSVValue(data.coordinator?.organizationURL)],
    ];

    // Convert project info to CSV
    let csvContent = 'PROJECT INFORMATION\n';

    csvContent += projectInfo.map(row => row.join(',')).join('\n');

    // Add organizations as separate section if they exist
    if (data.organizations && data.organizations.length > 0) {
        csvContent += '\n\n'; // Empty lines for separation
        csvContent += 'OTHER ORGANIZATIONS\n';

        const orgHeaders = [
            'Role',
            'Name',
            'Number of Project',
            'Number of Coordinating',
            'Country',
            'SME',
            'Net EC Contribution (EUR)',
            'Total Cost (EUR)',
            'Organization URL',
        ];

        csvContent += orgHeaders.join(',') + '\n';

        // Sort organizations by order if available
        const sortedOrgs = [...data.organizations].sort((a, b) => {
            const orderA = parseInt(a.order) || 999;
            const orderB = parseInt(b.order) || 999;
            return orderA - orderB;
        });

        sortedOrgs.forEach(org => {
            const orgRow = [
                cleanCSVValue(org.role),
                cleanCSVValue(org.name),
                cleanCSVValue(org.project_count),
                cleanCSVValue(org.coordinator_count),
                cleanCSVValue(getName(org.country)),
                cleanCSVValue(org.SME),
                cleanCSVValue(org.netEcContribution),
                cleanCSVValue(org.totalCost),
                cleanCSVValue(org.organizationURL),
            ];
            csvContent += orgRow.join(',') + '\n';
        });
    }

    return csvContent;
};

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
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);

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

    // Multi-select handlers
    const handleToggleSelect = (projectId) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedProjectIds.length === filteredfavorites.length) {
            setSelectedProjectIds([]);
        } else {
            setSelectedProjectIds(filteredfavorites.map(p => p.id));
        }
    };

    const handleExportSelected = () => {
        if (selectedProjectIds.length === 0) {
            setAlertInfo({ open: true, message: 'Please select at least one project', severity: 'warning' });
            return;
        }

        try {
            const selectedProjects = favoriteProjects.filter(p => selectedProjectIds.includes(p.id));

            // LOG THE DATA STRUCTURE
            console.log('=== SELECTED PROJECTS DATA ===');
            console.log('Number of projects:', selectedProjects.length);
            if (selectedProjects.length > 0) {
                console.log('First project sample:', JSON.stringify(selectedProjects[0], null, 2));
                console.log('First project keys:', Object.keys(selectedProjects[0]));
            }

            let combinedCSV = '';

            selectedProjects.forEach((project, index) => {
                console.log(`--- Processing project ${index + 1} ---`);
                console.log('Project ID:', project.id);
                console.log('Has coordinator?', !!project.coordinator);
                console.log('Has organizations?', !!project.organizations);
                if (project.coordinator) {
                    console.log('Coordinator data:', project.coordinator);
                }
                if (project.organizations) {
                    console.log('Organizations count:', project.organizations.length);
                }

                if (index > 0) {
                    combinedCSV += '\n\n' + '='.repeat(80) + '\n\n';
                }
                combinedCSV += convertToCSV(project);
            });

            console.log('=== GENERATED CSV PREVIEW (first 500 chars) ===');
            console.log(combinedCSV.substring(0, 500));

            const BOM = '\uFEFF';
            const blob = new Blob([BOM + combinedCSV], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const filename = selectedProjectIds.length === 1
                ? `${selectedProjects[0].acronym || 'project'}_${selectedProjects[0].id}.csv`
                : `favorite_projects_${selectedProjectIds.length}_items.csv`;

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setAlertInfo({ open: true, message: `Successfully exported ${selectedProjectIds.length} project(s)` });
            setSelectedProjectIds([]);
        } catch (error) {
            console.error('Error exporting projects:', error);
            setAlertInfo({ open: true, message: 'Failed to export projects', severity: 'error' });
        }
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
                <h1 className='text-3xl mb-4 dark:text-gray-200 text-gray-800'>
                    <FavoriteIcon className='mr-3 mb-1' />Your Favorite Projects
                </h1>
                {/* <div className='flex my-2'> */}

                {/* Selection Controls */}
                {filteredfavorites.length > 0 && (
                    <div className='flex flex-wrap gap-x-3 items-center mb-3'>
                        <p className="max-w-2xl font-light text-gray-500 dark:text-gray-300 mr-5">
                            {favoriteProjects.length} project{favoriteProjects.length !== 1 ? 's' : ''} Favorite
                        </p>
                        <button
                            onClick={handleSelectAll}
                            className='px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition'
                        >
                            {selectedProjectIds.length === filteredfavorites.length ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className='text-sm text-gray-600 dark:text-gray-300'>
                            {selectedProjectIds.length} selected
                        </span>
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
                                    onClick={() => setSelectedProjectIds([])}
                                    className='px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition'
                                >
                                    Clear Selection
                                </button>
                            </>
                        )}
                    </div>
                )}
                {/* </div> */}


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
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Checkbox
                                                    checked={selectedProjectIds.includes(project.id)}
                                                    onChange={() => handleToggleSelect(project.id)}
                                                    sx={{
                                                        color: isDark ? '#9ca3af' : '#6b7280',
                                                        '&.Mui-checked': {
                                                            color: '#3b82f6',
                                                        },
                                                    }}
                                                />
                                                <Typography
                                                    gutterBottom
                                                    variant="body2"
                                                    component="div"
                                                    sx={{ color: isDark ? '#e5e7eb' : 'text.primary', marginBottom: 0 }}>
                                                    <span className='text-xs px-2 text-white py-1 rounded bg-gray-500'>ID: {project.id}</span>
                                                </Typography>
                                            </Stack>
                                            <IconButton onClick={(e) => handleOpenMenu(e, project)} size='small'>
                                                <MoreVertIcon className='dark:text-white' />
                                            </IconButton>
                                        </Stack>

                                        <Typography gutterBottom variant="body2" component="div"
                                            sx={{ color: 'blue', ml: 6 }}>
                                            {project.acronym}
                                        </Typography>
                                        <Typography variant="h6"
                                            className='hover:text-blue-500 cursor-pointer'
                                            onClick={() => handleProjectClick(project.id)}
                                            sx={{ color: isDark ? '#e5e7eb' : 'text.primary', paddingRight: '9rem', ml: 6 }}>
                                            {project.title}
                                        </Typography>
                                    </Box>
                                    <Divider />
                                </Card>
                            </div>
                        </li>
                    ))}
                </ul>

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
                    <DeleteIcon className={isDark ? 'mr-2 text-white' : 'mr-2 text-gray-900'} fontSize='small' />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Delete</span>
                </MenuItem>

                <MenuItem onClick={() => handleShare(selectedProject)}>
                    <ShareIcon className={isDark ? 'mr-2 text-white' : 'mr-2 text-gray-900'} fontSize='small' />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Share</span>
                </MenuItem>
                {/* <MenuItem onClick={handleCloseMenu}>
                    <FileDownloadIcon className={isDark ? 'mr-2 text-white' : 'mr-2 text-gray-900'} fontSize='small' />
                    <span className={isDark ? 'text-white' : 'text-gray-900'}>Export (Coming Soon)</span>
                </MenuItem> */}
            </Menu>
        </div>
    );
};

export default FavoriteProjects;