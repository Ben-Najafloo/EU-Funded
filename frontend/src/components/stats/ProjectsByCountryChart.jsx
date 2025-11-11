import React, { useEffect, useState } from "react";
import { Pie } from "react-chartjs-2";
import { getName } from "country-list";
import { FadeLoader } from "react-spinners";
import {
    Chart as ChartJS,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from "chart.js";

ChartJS.register(Title, Tooltip, Legend, ArcElement);

export default function ProjectsByCountryChart() {
    const [chartData, setChartData] = useState(null);

    const baseURL = import.meta.env.VITE_API_BASE_URL

    useEffect(() => {
        fetch(`${baseURL}/stats/projects_by_country`)
            .then((res) => res.json())
            .then((data) => {
                setChartData({
                    labels: data.map((item) => getName(item.country) || "Unknown"),
                    datasets: [
                        {
                            label: "Number of Projects",
                            data: data.map((item) => item.project_count),
                            backgroundColor: [
                                "#FF6384",
                                "#FF9F40",
                                "#5A9BC8", // Darker blue
                                "#66CC66", // Darker green
                                "#F0A040", // Darker peach-orange
                                "#9E8AC9", // Darker lavender
                                "#F05959", // Darker coral
                                "#9BB5C4", // Darker light blue
                                "#F5F586", // Darker light yellow
                                "#739E71", // Darker sage green
                                "#E48AB0", // Darker pink
                                "#BA88B8", // Darker mauve
                            ],
                            borderWidth: 1,
                        },
                    ],
                });
            });
    }, []);

    if (!chartData) return (
        <div className="w-full max-w-lg h-96">
            <FadeLoader className="w-1/2 mx-auto" />
        </div>
    );

    return (
        <div className="shadow rounded-2xl h-96 w-full max-w-lg mx-auto">
            <h2 className="text-lg  text-center">
                Top 10 Countries with the most Projects!
            </h2>
            <Pie
                data={chartData}
                options={{
                    responsive: true,
                    plugins: {
                        legend: {
                            position: "right",
                            labels: {
                                boxWidth: 40,
                                padding: 10,
                            },
                        },
                    },
                    layout: {
                        padding: {

                            left: 30,
                        },
                    },
                }}
            />

        </div>
    );
}


