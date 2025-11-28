import { useEffect, useState } from "react";
import {FaClock } from "react-icons/fa";

const ReminingDays = ({ endDate }) => {
    const [remainingDays, setRemainingDays] = useState(null);

    useEffect(() => {
        if (endDate) {
            calculateRemainingDays(endDate);
        }
    }, [endDate]);

    const calculateRemainingDays = (endDate) => {
        const today = new Date();
        const end = new Date(endDate);
        const diffTime = end - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setRemainingDays(diffDays);
    };
    return (
        
            <span className={`inline-flex items-center px-3 py-1 rounded mr-2 text-xs font-medium ${remainingDays < 0
                ? "bg-red-100 text-red-800"
                : remainingDays < 30
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-green-100 text-green-800"
                }`}>
                <FaClock className="mr-1" />
                {remainingDays < 0 ? `Ended ${Math.abs(remainingDays)} days ago` : `${remainingDays} days remaining`}
            </span>

    )
}

export default ReminingDays