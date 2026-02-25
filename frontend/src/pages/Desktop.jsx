import React, { useContext } from 'react'
import SearchAndFilter from '../components/SearchAndFilter'
import RecommendedProjects from '../components/RecommendedProjects'
import { SearchContext } from '../contexts/SearchContext';

const Desktop = () => {
    const { searchActive } = useContext(SearchContext);

    return (
        <div className=' w-full m-auto pt-25 min-h-screen'>

            <header className={`text-xl  text-gray-800 dark:text-gray-300 transition-all duration-400 ease-in-out ${searchActive ? 'hidden' : ''}`}>
                Enter a search term or apply filters to see projects
            </header>
            <SearchAndFilter />
            {/* <RecommendedProjects all={false} className={`${searchActive} ? 'bg-gray-100' : ''`} /> */}
            {!searchActive && <RecommendedProjects all={false} />}

        </div>
    )
}

export default Desktop
