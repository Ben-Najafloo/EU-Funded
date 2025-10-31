// components/stats/Stats.jsx
import React from 'react'
import ProjectsPerProgrammeChart from './ProjectsPerProgrammeChart'
import CountryMerg from './CountryMerg'
import ProjectsOverYears from './ProjectsOverYears'
import ProjectsByEuContribution from './ProjectsByEuContribution'
import LazyLoad from '../LazyLoad'


const Stats = () => {
    return (
        <div className='mt-20'>
            <div className="grid gap-y-11 grid-cols-1">
                <LazyLoad placeholderHeight="300px">
                    <ProjectsPerProgrammeChart />
                </LazyLoad>

                <LazyLoad placeholderHeight="400px">
                    <CountryMerg />
                </LazyLoad>

                <LazyLoad placeholderHeight="300px">
                    <ProjectsOverYears />
                </LazyLoad>

                <LazyLoad placeholderHeight="400px">
                    <ProjectsByEuContribution />
                </LazyLoad>
            </div>
        </div>
    )
}

export default Stats