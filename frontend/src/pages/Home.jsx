import ExpieringSoon from '../components/ExpieringSoon'
import Hero from '../components/Hero'
import RecentlyAdded from '../components/RecentlyAdded'
import { motion } from "framer-motion";
import ClosedProjectsCompo from '../components/ClosedProjectsCompo'
import { FaArrowRight } from 'react-icons/fa'
import { Link } from 'react-router-dom'
import ProjectsPerProgrammeChart from '../components/stats/ProjectsPerProgrammeChart'
import { Card, CardContent } from '../components/ui/card'
import { BarChart3, Search, Brain, Building2, UserCog, Layers } from "lucide-react";
import { FaArrowRightArrowLeft } from 'react-icons/fa6';
import { RiPresentationLine } from 'react-icons/ri';


const Home = () => {

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

    function FeatureCard({ icon, title, description, link, anabled }) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
            >
                <Card className="rounded-2xl shadow-sm h-full bg-gray-50 dark:bg-gray-800">
                    <CardContent className="p-6 flex flex-col gap-4">
                        <div className="text-primary">{icon}</div>
                        <h3 className="text-xl font-semibold">{title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {description}
                        </p>
                        {anabled && (
                            <Link to={link} className="flex text-gray-800 dark:text-gray-300 hover:text-blue-500 cursor-pointer focus:ring-4 focus:outline-none focus:ring-black font-medium text-base">
                                Get Started
                                <FaArrowRight size={20} className="pt-1 ml-2" />
                            </Link>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        );
    }

    return (
        <div className=' w-full m-auto pt-20 min-h-screen'>

            <Hero />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                <FeatureCard
                    icon={<Search size={28} />}
                    title="Projects"
                    description="Start discovering relevant EU-funded projects, analyze participation trends,
                    and uncover partnership opportunities tailored to your interests."
                    link="/desktop"
                    anabled
                />
                <FeatureCard
                    icon={<Building2 size={28} />}
                    title="Organizations"
                    description="Explore in-depth organization profiles, participation metrics, and funding statistics to better understand key players across the EU research landscape."
                />
                <FeatureCard
                    icon={<RiPresentationLine size={28} />}
                    title="Documentation"
                    description="Access structured documentation and practical guidance to better understand the platform’s capabilities and navigate EU funding data with confidence."
                    anabled
                    link="/docs"
                />

            </div>

            <Block link="/stats" component={ProjectsPerProgrammeChart} />
            <RecentlyAdded all={false} />
            <Block link="/expiring" component={ExpieringSoon} />
            <Block link="/closed" component={ClosedProjectsCompo} />

        </div>
    )
}

export default Home


