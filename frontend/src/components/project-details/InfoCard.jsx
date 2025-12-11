import React from 'react'

const InfoCard = ({ title, value, icon, className = "" }) => (
    <div className={` p-4 rounded-lg shadow border border-gray-100 ${className}`}>
        <div className="flex items-center mb-2">
            <span className="text-gray-500 dark:text-gray-400 mr-2">{icon}</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        </div>
        <p className="text-base font-semibold text-gray-900 dark:text-gray-300">{value || "Not Defined"}</p>
    </div>
);

export default InfoCard
