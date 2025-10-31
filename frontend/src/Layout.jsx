import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Nav from './components/Nav';
import Footer from './components/Footer';
import ThemeContext from './contexts/ThemeContext';


const Layout = () => {
    // Initialize from localStorage or default to false
    const [isDark, setIsDark] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        return savedTheme === 'dark';
    });

    // Save to localStorage whenever theme changes
    useEffect(() => {
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    const toggleTheme = () => {
        setIsDark(prev => !prev);
    }

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            <div id="rootDiv" className={isDark ? 'dark' : ''}>
                <div className='dark:bg-black'>
                    <Nav />
                    <div className='lg:w-9/12 w-full m-auto'>
                        <Outlet />
                    </div>
                    <Footer />
                </div>
            </div>
        </ThemeContext.Provider>
    )
}

export default Layout;