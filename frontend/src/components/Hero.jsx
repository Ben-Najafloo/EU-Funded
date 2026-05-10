import React from 'react'
import StatisticsSummaryComp from './stats/StatisticsSummaryComp';

const Hero = () => {
    return (

        <div className="flex py-2 lg:py-20">
            <div className="mr-auto place-self-center lg:col-span-8 flex justify-between w-full">
                <div>
                    <h1 className="dark:text-white max-w-2xl mb-4 text-3xl tracking-tight leading-none sm:text-3xl ">
                        See EU Funded,
                    </h1>
                    <h3 className="dark:text-white max-w-2xl mb-6 text-2xl tracking-tight leading-none md:text-3xl xl:text-3xl ">Make better decisions faster</h3>
                    <p className="max-w-2xl mb-4 font-light text-gray-500 dark:text-gray-200 md:text-lg lg:text-xl 400">
                        {/* Discover and act on private market activity with <br /> predictive company intelligence. */}
                        Nexora gives you instant access to CORDIS data — search projects, analyze organizations, and track EU funding across Europe.
                    </p>
                </div>
                <StatisticsSummaryComp />
            </div>
        </div>

    )
}

export default Hero
