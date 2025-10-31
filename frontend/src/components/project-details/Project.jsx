import { useState, useEffect } from 'react';
import { VscRobot, VscLaw, VscWorkspaceTrusted } from "react-icons/vsc";
import { FaCalendarCheck, FaTag, FaGlobe, FaEuroSign, FaCreditCard, FaLightbulb, FaClock } from "react-icons/fa";
import { MdEventNote } from "react-icons/md";
import ObjectiveSummary from './ObjectiveSummary';
import ActionMenu from './ActionMenu';

const Project = ({ project }) => {
    const [viewDetails, setViewDetails] = useState(false);
    const [remainingDays, setRemainingDays] = useState(null);

    const [showAiSummary, setShowAiSummary] = useState(false)

    useEffect(() => {
        if (project.endDate) {
            calculateRemainingDays(project.endDate);
        }
    }, [project.endDate]);

    const calculateRemainingDays = (endDate) => {
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setRemainingDays(diffDays);
    };

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

    const InfoCard = ({ title, value, icon, className = "" }) => (
        <div className={` p-4 rounded-lg shadow border border-gray-100 ${className}`}>
            <div className="flex items-center mb-2">
                <span className="text-gray-500 dark:text-gray-400 mr-2">{icon}</span>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
            </div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-300">{value || "Not Defined"}</p>
        </div>
    );

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
                                {remainingDays !== null && (
                                    <span className={`inline-flex items-center px-3 py-1 rounded mr-2 text-xs font-medium ${remainingDays < 0
                                        ? "bg-red-100 text-red-800"
                                        : remainingDays < 30
                                            ? "bg-yellow-100 text-yellow-800"
                                            : "bg-green-100 text-green-800"
                                        }`}>
                                        <FaClock className="mr-1" />
                                        {remainingDays < 0 ? `Ended ${Math.abs(remainingDays)} days ago` : `${remainingDays} days remaining`}
                                    </span>
                                )}
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