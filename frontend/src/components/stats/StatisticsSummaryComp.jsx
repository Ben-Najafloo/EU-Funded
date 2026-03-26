"use client"

import React, { useEffect, useState } from 'react';
import { StatisticsSummary } from '../../services/api';
import {
    FaArrowLeft,
    FaArrowRight,
    FaChartBar,
    FaEuroSign,
    FaGlobe,
    FaUniversity
} from 'react-icons/fa';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"


const StatisticsSummaryComp = () => {
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                setLoading(true);
                const data = await StatisticsSummary();
                setStatistics(data);
            } catch (err) {
                console.error('Error fetching statistics:', err);
                setError('Failed to load statistics');
            } finally {
                setLoading(false);
            }
        };

        fetchStatistics();
    }, []);

    // Format numbers for display
    const formatNumber = (num) => {
        if (num === undefined || num === null) return 'N/A';
        return new Intl.NumberFormat('en-US').format(num);
    };

    const formatCurrency = (amount) => {
        if (amount === undefined || amount === null) return 'N/A';

        if (amount >= 1000000000) {
            return `€${(amount / 1000000000).toFixed(1)}B`;
        } else if (amount >= 1000000) {
            return `€${(amount / 1000000).toFixed(1)}M`;
        } else if (amount >= 1000) {
            return `€${(amount / 1000).toFixed(1)}K`;
        }
        return `€${amount}`;
    };

    if (error) {
        return (
            <div className="bg-white py-2 border-b border-gray-200 shadow-sm">
                <p className="text-red-600 text-center text-sm">{error}</p>
            </div>
        );
    }

    const plugin = React.useRef(
        Autoplay({ delay: 4000, stopOnInteraction: true })
    )

    const statItems = [
        {
            key: 'total_projects',
            label: 'Total Projects',
            value: statistics ? formatNumber(statistics.total_projects) : 'N/A',
            icon: <FaChartBar />,
            change: -2
        },
        {
            key: 'total_contribution',
            label: 'Total Funding',
            value: statistics ? formatCurrency(statistics.total_contribution) : 'N/A',
            icon: <FaEuroSign />,
            change: 34296
        },
        {
            key: 'countries_involved',
            label: 'Countries',
            value: statistics ? formatNumber(statistics.countries_involved) : 'N/A',
            icon: <FaGlobe />,
            change: '-'
        },
        {
            key: 'organizations_count',
            label: 'Organizations',
            value: statistics ? formatNumber(statistics.organizations_count) : 'N/A',
            icon: <FaUniversity />,
            change: 34
        }
    ];

    return (
        <Carousel
            plugins={[plugin.current]}
            className="w-full max-w-[8rem] sm:max-w-xs "
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
        >
            <CarouselContent className="p-5">
                {statItems.map((item) => (
                    <CarouselItem key={item.key}>
                        <div className="p-1">
                            <div
                                className={`border border-gray-700 dark:border-gray-400 rounded-lg pl-8 px-4 py-4 text-white shadow-md transition-transform duration-200 hover:scale-105 hover:shadow-lg`}
                            >
                                <div className="flex items-center mb-4 text-gray-800 dark:text-white">
                                    <div className="bg-opacity-20 rounded-full  mr-2">
                                        {item.icon}
                                    </div>
                                    <span className="text-sm  opacity-90">{item.label}</span>
                                </div>

                                {loading ? (
                                    <div className="h-6  bg-opacity-20 rounded animate-pulse"></div>
                                ) : (
                                    <div className="text-base font-bold flex text-gray-800 dark:text-white">
                                        {item.change > 0 ? (
                                            <div className='flex mr-3'>
                                                <ArrowUpwardIcon className="text-sm text-green-500" />
                                                <span className="text-sm text-green-500">{item.change}</span>
                                            </div>
                                        ) : item.change < 0 ? (
                                            <div className='flex mr-3'>
                                                <ArrowDownwardIcon className="text-sm text-red-500" />
                                                <span className="text-sm text-red-500">{item.change}</span>
                                            </div>
                                        ) : (
                                            <span className="mr-3 text-sm">{item.change}</span>
                                        )}

                                        <span className="text-sm">{item.value}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>

            <CarouselNext className=" transform -translate-y-1/2 z-10 cursor-pointer">
                <FaArrowRight />
            </CarouselNext>
            <CarouselPrevious className=" transform -translate-y-1/2 z-10 cursor-pointer">
                <FaArrowLeft />
            </CarouselPrevious>
        </Carousel>

    );
};

export default StatisticsSummaryComp;







