import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { SearchContext } from '../contexts/SearchContext';
import HomeIcon from '@mui/icons-material/Home';
import BarChartIcon from '@mui/icons-material/BarChart';
import CorporateFareIcon from '@mui/icons-material/CorporateFare';
import NewReleasesIcon from '@mui/icons-material/NewReleases';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import HourglassDisabledIcon from '@mui/icons-material/HourglassDisabled';
import HistoryIcon from '@mui/icons-material/History';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import LoginIcon from '@mui/icons-material/Login';
import FavoriteIcon from '@mui/icons-material/Favorite';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import { IoIosSunny, IoIosMoon } from "react-icons/io";
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';

import { SignedIn, SignedOut, useAuth, UserButton } from '@clerk/clerk-react';

import PreferProjects from './user/PreferProjects';
import { useTheme } from '../contexts/ThemeContext';

const actions = [
    { icon: <HomeIcon />, name: 'Home', route: '/' },
    { icon: <BarChartIcon />, name: 'Statistics', route: '/stats' },
    { icon: <CorporateFareIcon />, name: 'Organizations', route: '/all-projects' },
    { icon: <NewReleasesIcon />, name: 'Recently Added Projects', route: '/recent' },
    { icon: <HourglassDisabledIcon />, name: 'Expiring Projects', route: '/expiring' },
    { icon: <EventBusyIcon />, name: 'Closed Projects', route: '/closed' }
];

export default function Category() {

    const { setSearchTerm } = useContext(SearchContext);
    const { isDark, toggleTheme } = useTheme();

    const { isSignedIn } = useAuth();

    const [preferVisible, setPreferVisible] = useState(false);

    const MenuButton = ({ link, icon: Icon, title }) => {
        return (
            <Tooltip
                title={title}
                placement="bottom-start"
                arrow
                slots={{
                    transition: Fade,
                }}
                slotProps={{
                    transition: { timeout: 600 },
                }}
            >
                <Link to={link} className="mx-3 cursor-pointer text-gray-700 dark:text-gray-200 hover:text-blue-600">
                    {Icon && <Icon className='rounded-full' />}
                </Link>
            </Tooltip>
        )
    }

    return (
        <>
            <div className="flex justify-between py-3 px-9" >
                <Link to="/" onClick={() => { setSearchTerm('') }}
                    className='text-3xl hover:text-blue-600 cursor-pointer bg-gradient-to-r from-gray-800 to-blue-800 dark:from-white dark:to-blue-800 text-transparent bg-clip-text'
                >
                    NEXORA
                </Link>
                <div className='pt-2 flex'>

                    <div className=' hidden md:flex'>
                        <MenuButton link="/" title="Home" icon={HomeIcon} />
                        <MenuButton link="/org" title="Organizations" icon={CorporateFareIcon} />
                        <MenuButton link="/stats" title="Statistics" icon={BarChartIcon} />
                        <MenuButton link="/recent" title="New Projects" icon={NewReleasesIcon} />
                        <MenuButton link="/expiring" title="Expiring Projects" icon={HourglassDisabledIcon} />
                        <MenuButton link="/closed" title="Closed Projects" icon={EventBusyIcon} />
                        {isSignedIn && <MenuButton link="/favorite-projects" title="Favorite Projects" icon={FavoriteIcon} />}
                        {isSignedIn && <MenuButton link="/history-projects" title="History" icon={HistoryIcon} />}
                        {isSignedIn && (
                            <Tooltip
                                title="Preference"
                                placement="bottom-start"
                                arrow
                                slots={{
                                    transition: Fade,
                                }}
                                slotProps={{
                                    transition: { timeout: 600 },
                                }}
                            >
                                <button onClick={() => setPreferVisible(true)} className="mx-3 cursor-pointer text-gray-700 dark:text-gray-200 hover:text-blue-600 mb-2">
                                    <AdsClickIcon className='rounded-full' />
                                </button>
                            </Tooltip>
                        )}
                    </div>

                    <button
                        onClick={toggleTheme}
                        className='px-4 py-1 ml-16 mb-1 rounded border dark:bg-gray-900 dark:text-white'
                    >
                        {isDark ? (<IoIosSunny />) : (<IoIosMoon />)}
                    </button>

                    <div className='ml-3 '>
                        <header>
                            <SignedOut>
                                <MenuButton link="/sign-in" title="Login" icon={LoginIcon} />
                            </SignedOut>
                            <SignedIn>
                                <UserButton>
                                    <UserButton.MenuItems>
                                        {/* <UserButton.Link
                                            label='Favorite List'
                                            href='/favorite-projects'
                                            labelIcon={<FavoriteIcon fontSize="small" />}
                                        />
                                        <UserButton.Link
                                            label='History List'
                                            href='/history-projects'
                                            labelIcon={<HistoryIcon fontSize="small" />}
                                        /> */}
                                        <UserButton.Link
                                            label='manageAccount'
                                        />
                                        <UserButton.Link
                                            label='signOut'
                                        />
                                    </UserButton.MenuItems>
                                </UserButton>
                            </SignedIn>
                        </header>
                    </div>


                    <div className="md:hidden flex items-center bg-amber-50 fixed right-7">

                        <Box sx={{ height: 40, transform: 'translateZ(0px)', flexGrow: 1 }}>
                            <SpeedDial
                                ariaLabel="SpeedDial"
                                sx={{
                                    '& .MuiSpeedDial-fab': {
                                        bgcolor: 'gray',
                                        '&:hover': {
                                            bgcolor: 'lightblue',
                                        },
                                        width: 40,
                                        height: 40,
                                    },
                                }}
                                icon={<ExpandMoreIcon />}
                                direction="down"
                            >
                                {actions.map((action) => (
                                    <SpeedDialAction
                                        key={action.name}
                                        icon={action.icon}
                                        tooltipTitle={action.name}
                                        onClick={() => navigate(action.route)}
                                    />
                                ))}
                            </SpeedDial>
                        </Box>
                    </div>


                    {/* PreferProjects Box */}
                    <PreferProjects
                        setPreferVisible={setPreferVisible}
                        preferVisible={preferVisible}
                    />


                </div>

            </div>
        </>
    );
}
