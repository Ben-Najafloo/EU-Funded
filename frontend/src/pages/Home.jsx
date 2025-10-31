import { SearchContext } from '../contexts/SearchContext'
import ExpieringSoon from '../components/ExpieringSoon'
import Hero from '../components/Hero'
import RecentlyAdded from '../components/RecentlyAdded'
import SearchAndFilter from '../components/SearchAndFilter'
import { useContext } from 'react';
import ClosedProjectsCompo from '../components/ClosedProjectsCompo'
import { FaArrowRight } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import ProjectsPerProgrammeChart from '../components/stats/ProjectsPerProgrammeChart'

const Home = () => {
    const { searchActive } = useContext(SearchContext);

    const Block = ({ link, component: Component }) => {
        return (
            <div className='flex items-center'>
                <div className='w-full sm:w-5/6'>
                    <Component all={false} />
                </div>
                <div className='w-1/6 hidden sm:block pl-20'>
                    <Link
                        to={link}
                        className="text-gray-800 dark:text-gray-300 hover:text-blue-500 cursor-pointer focus:ring-4 focus:outline-none focus:ring-black font-medium text-base px-7">
                        <span className='text-sm'>See More</span>
                        <FaArrowRight className="text-lg" />
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className=' w-full m-auto pt-20 min-h-screen '>

            {!searchActive && <Hero />}
            <SearchAndFilter />
            {!searchActive && (<>
                <Block link="/stats" component={ProjectsPerProgrammeChart} />
                <Block link="/recent" component={RecentlyAdded} />
                <Block link="/expiring" component={ExpieringSoon} />
                <Block link="/closed" component={ClosedProjectsCompo} />
            </>
            )}
        </div>
    )
}

export default Home


