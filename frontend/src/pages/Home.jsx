import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, BarChart3, Building2 } from 'lucide-react';
import { RiPresentationLine } from 'react-icons/ri';
import { FaArrowRight } from 'react-icons/fa';
import Hero from '../components/Hero';
import Cards from '../components/Cards';
import { RecentProjects, WillExpiredProjects, ExpiredProjects } from '../services/api';

// ── shared scroll row ─────────────────────────────────────────────────────────
const ProjectScrollRow = ({ title, subtitle, link, queryKey, queryFn }) => {
    const { data = [], isPending } = useQuery({
        queryKey: [queryKey],
        queryFn,
        staleTime: 1000 * 60 * 5,
    });

    const CardSkeleton = () => (
        <div className="flex-shrink-0 w-64 h-52 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
    );

    return (
        <div className="mt-16">
            <div className="flex items-end justify-between mb-4">
                <div>
                    <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100">{title}</h2>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>
                </div>
                <Link
                    to={link}
                    className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors flex-shrink-0 ml-4"
                >
                    See all <FaArrowRight size={11} />
                </Link>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
                {isPending
                    ? [...Array(5)].map((_, i) => <CardSkeleton key={i} />)
                    : data.slice(0, 8).map(project => (
                        <div key={project.id} className="flex-shrink-0 w-64">
                            <Cards
                                {...project}
                                link={`/project/${project.id}`}
                                pState={{ project }}
                            />
                        </div>
                    ))
                }
            </div>
        </div>
    );
};

// ── feature card ──────────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, link, enabled }) => (
    <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.35 }}
        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 flex flex-col gap-3"
    >
        <div className="text-gray-500 dark:text-gray-400">{icon}</div>
        <h3 className="text-base font-medium text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
            {description}
        </p>
        {enabled && link && (
            <Link
                to={link}
                className="flex items-center gap-1.5 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 transition-colors mt-1 w-fit"
            >
                Get started <FaArrowRight size={11} />
            </Link>
        )}
    </motion.div>
);

// ── page ──────────────────────────────────────────────────────────────────────
const Home = () => (
    <div className="w-full mx-auto pt-16 pb-20 min-h-screen">

        {/* Act 1 — Hero */}
        <Hero />

        {/* Divider */}
        <div className="border-t border-gray-100 dark:border-gray-800" />

        {/* Act 2 — Feature cards */}
        <div className="mt-14 mb-2">
            <p className="text-xs font-medium tracking-widest uppercase text-gray-400 dark:text-gray-500 mb-6">
                What you can do
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <FeatureCard
                    icon={<Search size={22} />}
                    title="Search projects"
                    description="Find EU-funded research projects by keyword, topic, country, funding range, or programme. Filter and export results."
                    link="/desktop"
                    enabled
                />
                <FeatureCard
                    icon={<Building2 size={22} />}
                    title="Explore organizations"
                    description="Browse organization profiles, participation metrics, funding statistics, and discover key players across the EU research landscape."
                    link="/search-organizations"
                    enabled
                />
                <FeatureCard
                    icon={<BarChart3 size={22} />}
                    title="Analytics & stats"
                    description="Visualize project distribution by country, programme, and year. Explore funding trends and top performers across all of CORDIS."
                    link="/stats"
                    enabled
                />
                <FeatureCard
                    icon={<RiPresentationLine size={22} />}
                    title="Documentation"
                    description="Access structured guidance to navigate the platform and understand how to make the most of EU funding data."
                    link="/docs"
                    enabled
                />
            </div>
        </div>

        {/* Act 3 — Live data rows */}
        <ProjectScrollRow
            title="Recently added"
            subtitle="Latest projects entered in the database"
            link="/recent"
            queryKey="recentProjects"
            queryFn={RecentProjects}
        />

        <ProjectScrollRow
            title="Expiring soon"
            subtitle="Projects ending in the coming months"
            link="/expiring"
            queryKey="expiringSoon"
            queryFn={WillExpiredProjects}
        />

        <ProjectScrollRow
            title="Closed projects"
            subtitle="Recently closed EU-funded projects"
            link="/closed"
            queryKey="expiredProjects"
            queryFn={ExpiredProjects}
        />

    </div>
);

export default Home;