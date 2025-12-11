import { useState, useEffect } from 'react';
import { VscRobot, VscLaw, VscWorkspaceTrusted } from "react-icons/vsc";
import { FaCalendarCheck, FaTag, FaGlobe, FaEuroSign, FaCreditCard, FaLightbulb } from "react-icons/fa";
import { MdEventNote } from "react-icons/md";
import ObjectiveSummary from './ObjectiveSummary';
import ActionMenu from './ActionMenu';
import ReactCountryFlag from "react-country-flag";
import { getName, getCode } from 'country-list';
import ReminingDays from './ReminingDays';
import InfoCard from './InfoCard';

const Project = ({ project }) => {
    const [viewDetails, setViewDetails] = useState(false);

    const [showAiSummary, setShowAiSummary] = useState(false)

    const getStatusColor = (status) => {
        switch (status) {
            case "SIGNED":
                return "bg-green-100 text-green-800";
            case "CLOSED":
                return "bg-red-100 text-red-800";
            case "ONGOING":
                return "bg-blue-100 text-blue-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
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

    // Get country distribution
    const getCountryStats = () => {
        if (!project.organizations) return {};
        const countries = {};
        project.organizations.forEach(org => {
            if (org.country) {
                countries[org.country] = (countries[org.country] || 0) + 1;
            }
        });
        return countries;
    };
    const countryStats = getCountryStats();

    const DetailItem = ({ icon, label, value }) => (
        <div className="flex items-start py-3 border-b border-gray-100 last:border-b-0">
            <span className="text-gray-400 mr-3 mt-1">{icon}</span>
            <div className="flex-1 text-sm">
                <p className="text-gray-600 dark:text-gray-400">{label}</p>
                <p className="text-gray-900 dark:text-gray-300">{value || "Not Defined"}</p>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden ">
            {/* Header Section */}
            <div className="p-6 ">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <span className="inline-flex items-center px-3 py-1 rounded mr-2 text-sm font-medium bg-blue-100 text-blue-800">
                            {project.acronym}
                        </span>

                        <div className="flex justify-between">
                            <h1 className="text-2xl text-gray-900 dark:text-gray-300 mb-2">{project.title}</h1>
                            <ActionMenu id={project.id} project={project} />
                        </div>
                        <div className="flex justify-between mt-7">
                            <div>

                                <span className={`inline-flex items-center px-3 py-1 rounded mr-2 text-xs font-medium ${getStatusColor(project.status)}`}>
                                    {project.status}
                                </span>
                                <ReminingDays endDate={project.endDate} />
                            </div>

                            <span className="text-gray-800 dark:text-gray-300 inline-flex items-center px-3 py-1 rounded-full text-sm">
                                ID: {project.id}
                            </span>
                        </div>

                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 ">
                <InfoCard
                    title="Total Cost"
                    className='bg-cyan-100 dark:bg-gray-900'
                    value={formatCurrency(project.totalCost)}
                    icon={<FaEuroSign />}
                />
                <InfoCard
                    title="EU Contribution"
                    className='bg-blue-100 dark:bg-gray-800'
                    value={formatCurrency(project.eu_contribution || project.ecMaxContribution)}
                    icon={<FaCreditCard />}
                />
                <InfoCard
                    title="Funding Scheme"
                    className='bg-cyan-100 dark:bg-gray-900'
                    value={project.fundingScheme}
                    icon={<VscWorkspaceTrusted />}
                />
            </div>

            {/* Details Section */}
            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-4 flex items-center">
                            <FaCalendarCheck className="mr-2 text-gray-500 dark:text-gray-400" />
                            Project Timeline
                        </h3>
                        <DetailItem
                            icon={<MdEventNote />}
                            label="Start Date"
                            value={project.startDate}
                        />
                        <DetailItem
                            icon={<MdEventNote />}
                            label="End Date"
                            value={project.endDate}
                        />
                        <DetailItem
                            icon={<FaCalendarCheck />}
                            label="Signature Date"
                            value={project.ecSignatureDate}
                        />
                        <div className="py-3 border-b border-gray-100 last:border-b-0">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Countries involved </p>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(countryStats).map(([country, count]) => (
                                    <span className="mx-2">
                                        <ReactCountryFlag
                                            countryCode={country}
                                            svg
                                            style={{ width: '1.5em', height: '1.5em', marginRight: '0.4em' }}

                                        />
                                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full">
                                            {count}
                                        </span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-300 mb-4 flex items-center">
                            <FaTag className="mr-2 text-gray-500 dark:text-gray-400" />
                            Project Details
                        </h3>
                        <DetailItem
                            icon={<FaGlobe />}
                            label="Programme"
                            value={project.frameworkProgramme}
                        />
                        <DetailItem
                            icon={<VscLaw />}
                            label="Legal Basis"
                            value={project.legalBasis}
                        />
                        <DetailItem
                            icon={<FaTag />}
                            label="Topics"
                            value={project.topics}
                        />
                        {project.keywords && (
                            <div className="py-3 border-b border-gray-100 last:border-b-0">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Keywords</p>
                                <div className="flex flex-wrap gap-2">
                                    {project.keywords.split(",").map((keyword, index) => (
                                        <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                            {keyword.trim()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Objective Section */}
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
                        <FaLightbulb className="mr-2 text-gray-500 dark:text-gray-300" />
                        Project Objective
                        <button
                            onClick={() => { setShowAiSummary(!showAiSummary) }}
                            className="ml-auto flex items-center cursor-pointer text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                            <VscRobot className="mr-1" />
                            {!showAiSummary ? (
                                <span>Use AI to Make Summary</span>
                            ) : (
                                <span>See Original Text</span>
                            )}

                        </button>
                    </h3>

                    {!showAiSummary ? (
                        <div className="text-gray-700 dark:text-gray-200">
                            {!viewDetails ? (
                                <p>
                                    {project.objective.slice(0, 280)}
                                    {project.objective.length > 280 && (
                                        <button
                                            className="text-blue-600 hover:text-blue-800 font-medium ml-1"
                                            onClick={() => setViewDetails(true)}
                                        >
                                            ...Read more
                                        </button>
                                    )}
                                </p>
                            ) : (
                                <p>
                                    {project.objective}
                                    <button
                                        className="text-blue-600 hover:text-blue-800 font-medium ml-1"
                                        onClick={() => setViewDetails(false)}
                                    >
                                        Show less
                                    </button>
                                </p>
                            )}
                        </div>) : (
                        <ObjectiveSummary id={project.id} />
                    )}
                </div>

                {/* Additional Information Suggestions */}
                {project.rcn && (
                    <div className="mt-4 text-sm text-gray-500">
                        <p>RCN: {project.rcn}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Project;