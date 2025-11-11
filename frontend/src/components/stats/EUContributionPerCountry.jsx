
import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { getName } from 'country-list';
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
import { useTheme } from '../../contexts/ThemeContext';

ChartJS.register(
    Title,
    Tooltip,
    Legend,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement
);

const baseURL = import.meta.env.VITE_API_BASE_URL

export default function EUContributionPerCountry() {
    const [chartData, setChartData] = useState(null);
    const { isDark } = useTheme();

    useEffect(() => {
        fetch(`${baseURL}/stats/eu_contribution_per_country`)
            .then((res) => res.json())
            .then((data) => {
                setChartData({
                    labels: data.map((item) => getName(item.country)?.slice(0, 10) || "Unknown"),
                    datasets: [
                        {
                            data: data.map((item) => item.total_eu_contribution),
                            backgroundColor: [
                                "#6DAEDB",
                                "#77DD77",
                                "#FFB347",
                                "#B19CD9",
                                "#FF6961",
                                "#AEC6CF",
                                "#FDFD96",
                                "#84B082",
                                "#F49AC2",
                                "#CB99C9",
                            ],
                            borderColor: "rgba(255, 255, 255, 0.8)",
                            borderWidth: 1,
                            borderRadius: 6,
                            hoverBackgroundColor: [
                                "#5A9BC8",
                                "#66CC66",
                                "#F0A040",
                                "#9E8AC9",
                                "#F05959",
                                "#9BB5C4",
                                "#F5F586",
                                "#739E71",
                                "#E48AB0",
                                "#BA88B8",
                            ],
                        },
                    ],
                })
            })
    }, [])

    if (!chartData) return (
        <div className="w-full max-w-lg ">
            <ClipLoader className="w-1/2 mx-auto" />
        </div>
    );

    // Define colors based on theme
    const textColor = isDark ? '#e5e7eb' : '#1f2937';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';

    return (
        <div className="p-6 w-full max-w-6xl mx-auto">
            <div className="h-96">
                <Bar
                    data={chartData}
                    options={{
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
                                        return `€${context.raw.toLocaleString()}`;
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
                                        return '€' + value.toLocaleString();
                                    }
                                },
                                title: {
                                    display: true,
                                    text: "Contribution Amount (€)",
                                    color: textColor,
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
                                    display: true,
                                    text: "Data showing the contribution amounts from EU countries",
                                    color: textColor,
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
                    }}
                />
            </div>
        </div>
    );
}