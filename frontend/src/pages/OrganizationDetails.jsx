import { useQuery } from '@tanstack/react-query';
import { getOrganization } from '../services/tanstack/organizations';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { FaArrowLeftLong, FaLocationDot } from 'react-icons/fa6';
import InfoCard from '../components/project-details/InfoCard';
import { FaCrown, FaEuroSign, FaHandshake } from 'react-icons/fa';
import { TbWorldWww } from "react-icons/tb";
import { MdOutlineAllInclusive } from 'react-icons/md';
import { FcSearch } from "react-icons/fc";
import { GiEuropeanFlag } from "react-icons/gi";
import ReactCountryFlag from 'react-country-flag';
import { getCode, getName } from 'country-list';
import { useState } from 'react';
import { useInView } from 'react-intersection-observer';

import ImageIcon from '@mui/icons-material/Image';
import WorkIcon from '@mui/icons-material/Work';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import ScrappedInfo from '../components/project-details/ScrappedInfo';

const OrganizationDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [visibleCount, setVisibleCount] = useState(7);

    const { data, isPending, isError, error, isFetching } = useQuery({
        queryKey: ['org', id],
        queryFn: () => getOrganization(id),
        staleTime: 1000 * 60 * 5,
        enabled: !!id,
    });

    // Intersection observer for infinite scroll
    const { ref, inView } = useInView({
        threshold: 0,
    });

    // Load more when scrolling into view
    if (inView && data?.recent_projects && visibleCount < data.recent_projects.length) {
        setTimeout(() => setVisibleCount(prev => Math.min(prev + 10, data.recent_projects.length)), 100);
    }

    if (isPending) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-gray-500">Loading organization details...</p>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-red-500">
                    {error.message || 'Failed to load organization'}
                </p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-gray-500">No organization data found</p>
            </div>
        );
    }

    const handleBack = () => {
        navigate(-1);
    };

    const formatCurrency = (amount) => {
        if (!amount) return "N/A";
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const visibleProjects = data.recent_projects.slice(0, visibleCount);
    const hasMore = visibleCount < data.recent_projects.length;

    return (
        <div className="lg:flex py-5 pt-25 rounded space-y-3 border-t-2 border-gray-300 min-h-screen">
            <button
                onClick={handleBack}
                className="hidden sm:block fixed pt-20 h-96 text-gray-800 dark:text-gray-300 hover:text-blue-500 cursor-pointer focus:ring-4 focus:outline-none focus:ring-black font-medium text-base px-7">
                <span className='text-sm'>Back</span>
                <FaArrowLeftLong className="text-lg" />
            </button>
            <div className='lg:pl-24 min-h-screen w-full'>
                {isFetching && <p className="mt-4 text-sm text-gray-500">Refreshing data...</p>}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden p-6">
                    {/* Header Section */}
                    <div className="flex-1 justify-between items-start py-6">

                        {/* short name */}
                        <span className="inline-flex items-center px-3 py-1 rounded mr-2 text-sm font-medium bg-blue-100 text-blue-800">
                            Short Name:<strong className='ml-2'>  {data.shortName || 'N/A'}</strong>
                        </span>

                        {/* name , contact form */}
                        <div className="flex justify-between">
                            <div className='w-4/5'>
                                <h1 className="text-2xl text-gray-900 dark:text-gray-300 mb-2 pr-2">{data.name}</h1>
                            </div>
                            <div className='w-1/5 pl-10'>
                                <a target='blank' href={data.contactForm} className='flex bg-gray-200 hover:bg-gray-300 rounded px-2'>
                                    <GiEuropeanFlag className='bg-blue-600 text-white m-2 rounded' size={25} /> <span className='mt-2'>Contact Form</span>
                                </a>
                            </div>
                        </div>

                        {/* flag, country , city, google map location */}
                        <div className='flex text-gray-900 dark:text-gray-300'>
                            <ReactCountryFlag
                                countryCode={getCode(data.country) || data.country}
                                svg
                                style={{ width: '1.5em', height: '1.5em', }}
                                title={getName(data.country) || data.country}
                            />
                            <span className='ml-2 mt-1 text-sm'>{getName(data.country) + ' / ' || 'N/A'}</span>
                            <span className='ml-1 mt-1 text-sm'>{data.city || 'N/A'}</span>
                            <a target='blank'
                                href={`https://www.google.com/maps/search/?api=1&query=${data.geolocation}`}
                                title='Find on the map'>
                                <FaLocationDot className='m-1  hover:text-blue-500' />
                            </a>
                        </div>

                        {/* organization URL website */}
                        <div className='flex py-1 text-sm text-gray-900 dark:text-gray-300 my-2'>
                            <TbWorldWww className='mr-2 mt-1' />
                            <a target='blank' href={data.organizationURL} className="block text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-blue-500">
                                {data.organizationURL}
                            </a>
                        </div>

                        {/* Try get more information */}
                        <div className='flex py-1 text-sm text-gray-900 dark:text-gray-300 my-2'>
                            {/* <FcSearch className='mr-2 mt-1' />
                            <a target='blank' href="#" className="block text-sm font-medium text-gray-900 dark:text-gray-300 hover:text-blue-500">
                                Try get more information
                            </a> */}
                            <ScrappedInfo orgName={data.name} url={data.organizationURL} />

                        </div>

                        {/* sme, activity type, nuts, vat number */}
                        <div className="flex justify-between mt-7 text-sm">
                            <div>
                                <span className="inline-flex items-center px-3 py-1 rounded mr-2 text-sm font-medium bg-green-200 text-green-800">
                                    SME:<strong className='ml-2'>  {data.SME === 'true' ? 'Yes' : 'No'}</strong>
                                </span>
                                <span className="inline-flex items-center px-3 py-1 rounded mr-2 text-sm font-medium bg-green-100 text-green-800">
                                    Activity Type:<strong className='ml-2'>  {data.activityType}</strong>
                                </span>
                                <span title='Nomenclature of Territorial Units for Statistics' className="inline-flex items-center px-3 py-1 rounded mr-2 text-sm font-medium bg-blue-100 text-blue-800">
                                    NUTS Code:<strong className='ml-2'>  {data.nutsCode}</strong>
                                </span>
                            </div>

                            <span className="text-gray-800 dark:text-gray-300 inline-flex items-center px-3 py-1 rounded-full">
                                VAT Number: <strong className='ml-2'>  {data.vatNumber || 'N/A'}</strong>
                            </span>
                        </div>

                    </div>

                    {/* number of projects */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
                        <InfoCard
                            title="Total Projects"
                            className='bg-cyan-100 dark:bg-gray-900'
                            value={data.statistics?.total_projects || 0}
                            icon={<MdOutlineAllInclusive />}
                        />
                        <InfoCard
                            title="Coordinated"
                            className='bg-blue-100 dark:bg-gray-800'
                            value={data.statistics?.coordinated_projects || 0}
                            icon={<FaCrown />}
                        />
                        <InfoCard
                            title="Participated"
                            className='bg-cyan-100 dark:bg-gray-900'
                            value={data.statistics?.participated_projects || 0}
                            icon={<FaHandshake />}
                        />
                    </div>

                    {/* statistics */}
                    <fieldset className="border border-gray-400 p-4 rounded-lg mt-7 text-sm text-gray-900 dark:text-gray-300">
                        <legend className="px-2 ml-2">
                            Financial Statistics for all Projects
                        </legend>
                        <div className='grid grid-cols-1 md:grid-cols-2 gap-2 py-2'>
                            <div className='flex gap-x-2'>
                                <ImageIcon className='' />
                                <p className='w-48'>Average Funding per Project:</p>
                                <p>{formatCurrency(data.statistics.avg_funding_per_project) || ""}</p>
                            </div>
                            <div className='flex gap-x-2'>
                                <WorkIcon className='' />
                                <p className='w-48'>Total Cost:</p>
                                <p>{formatCurrency(data.statistics.total_cost) || ""}</p>
                            </div>
                            <div className='flex gap-x-2'>
                                <MonetizationOnIcon className='' />
                                <p className='w-48'>EC Contribution:</p>
                                <p>{formatCurrency(data.statistics.total_ec_contribution) || ""}</p>
                            </div>
                            <div className='flex gap-x-2'>
                                <MonetizationOnIcon className='' />
                                <p className='w-48'>Net EC Contribution:</p>
                                <p>{formatCurrency(data.statistics.total_net_ec_contribution) || ""}</p>
                            </div>
                        </div>
                    </fieldset>

                </div>

                {/* projects list with infinite scroll */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-6 mt-6">
                    <h2 className=" text-gray-900 dark:text-gray-300 mb-4">
                        Projects ({data.recent_projects.length})
                    </h2>

                    <div className="h-96 overflow-y-auto space-y-2 pr-2">
                        {visibleProjects.map((project, index) => (
                            <Link
                                key={project.id || index}
                                to={`/project/${project.id}`}
                                className="block p-3 border border-gray-300 dark:border-gray-700 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            >
                                <p className="flex gap-x-2 text-blue-600 dark:text-blue-400 font-medium">
                                    <span>{project.acronym || 'No Acronym'} </span>
                                    <span className='mt-1'>{project.organization_role === 'coordinator' && <FaCrown />}</span>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {project.title}
                                </p>
                            </Link>
                        ))}

                        {/* Loading trigger and indicator */}
                        {hasMore && (
                            <div ref={ref} className="py-4 text-center">
                                <p className="text-sm text-gray-500">Loading more projects...</p>
                            </div>
                        )}

                        {!hasMore && data.recent_projects.length > 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                                All projects loaded
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OrganizationDetails;