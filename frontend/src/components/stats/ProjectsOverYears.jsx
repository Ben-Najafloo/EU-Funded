
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement
} from "chart.js";
import { ClipLoader } from "react-spinners";
import ChartCache from "../../utils/ChartCache";

import { useTheme } from '../../contexts/ThemeContext';

// Check if Chart.js is already registered to avoid duplicate registration
let chartJsRegistered = false;

export default React.memo(function ProjectsOverYears() {
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const { isDark } = useTheme();

    const baseURL = import.meta.env.VITE_API_BASE_URL

    // Register Chart.js components once
    useEffect(() => {
        if (!chartJsRegistered) {
            ChartJS.register(
                Title,
                Tooltip,
                Legend,
                ArcElement,
                CategoryScale,
                LinearScale,
                BarElement
            );
            chartJsRegistered = true;
        }
    }, []);

    // Memoized colors - these depend on theme
    const textColor = useMemo(() => isDark ? '#e5e7eb' : '#1f2937', [isDark]);
    const gridColor = useMemo(() => isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)', [isDark]);

    // Memoized colors
    const backgroundColor = useMemo(() => [
        "#6DAEDB", "#77DD77", "#FFB347", "#B19CD9", "#FF6961",
        "#AEC6CF", "#FDFD96", "#84B082", "#F49AC2", "#CB99C9"
    ], []);

    const hoverBackgroundColor = useMemo(() => [
        "#5A9BC8", "#66CC66", "#F0A040", "#9E8AC9", "#F05959",
        "#9BB5C4", "#F5F586", "#739E71", "#E48AB0", "#BA88B8"
    ], []);

    // Memoized chart options
    const chartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'x',
        plugins: {
            legend: {
                display: false,
            },
            tooltip: {
                backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                titleColor: textColor,
                bodyColor: textColor,
                borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: 1,
                callbacks: {
                    label: function (context) {
                        return `${context.raw.toLocaleString()}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: gridColor,
                },
                ticks: {
                    color: textColor,
                    callback: function (value) {
                        return value.toLocaleString();
                    }
                },
                title: {
                    color: textColor,
                    display: true,
                    text: "Number of Projects",
                    font: {
                        weight: "bold",
                        size: 12
                    }
                }
            },
            x: {
                grid: {

                    display: false,
                },
                ticks: {
                    color: textColor,
                    maxRotation: 45,
                    minRotation: 45
                },
                title: {
                    color: textColor,
                    display: true,
                    text: "Year",
                    font: {
                        weight: "bold",
                        size: 12
                    }
                }
            },
        },
        elements: {
            bar: {
                barPercentage: 0.7,
                categoryPercentage: 0.8,
            }
        }
    }), [isDark, textColor, gridColor]);

    const fetchData = useCallback(async () => {
        const cacheKey = 'projects_over_time';
        const cachedData = ChartCache.get(cacheKey);

        if (cachedData) {
            processChartData(cachedData);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch(`${baseURL}/stats/projects_over_time`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Cache the data
            ChartCache.set(cacheKey, data);

            processChartData(data);
        } catch (err) {
            console.error("Error fetching chart data:", err);
            setError("Failed to load chart data");
        } finally {
            setLoading(false);
        }
    }, []);

    const processChartData = useCallback((data) => {
        setChartData({
            labels: data.map((item) => item.year || "Unknown"),
            datasets: [
                {
                    data: data.map((item) => item.project_count),
                    backgroundColor,
                    borderColor: "rgba(255, 255, 255, 0.8)",
                    borderWidth: 1,
                    borderRadius: 6,
                    hoverBackgroundColor,
                },
            ],
        });
    }, [backgroundColor, hoverBackgroundColor]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return (
        <div className="w-full max-w-lg flex justify-center items-center h-96">
            <ClipLoader size={50} color="#6DAEDB" />
        </div>
    );

    if (error) return (
        <div className="w-full max-w-lg mx-auto p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            <p>{error}</p>
            <button
                onClick={fetchData}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
                Retry
            </button>
        </div>
    );

    if (!chartData) return (
        <div className="w-full max-w-lg mx-auto p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
            <p>No data available for the chart.</p>
        </div>
    );

    return (
        <div className="p-6 w-full max-w-3xl mt-32 mx-auto">
            <h2 className="text-xl text-center mb-2 text-gray-800 dark:text-gray-200">
                Projects per Year
            </h2>
            <div className="h-96">
                <Bar
                    data={chartData}
                    options={chartOptions}
                    redraw={false}
                />
            </div>
            <div className="mt-4 text-sm text-gray-500 dark:text-gray-200 text-center">
                Data showing the number of projects per year
            </div>
        </div>
    );
});