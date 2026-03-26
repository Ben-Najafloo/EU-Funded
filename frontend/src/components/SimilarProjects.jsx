
import { useState, useCallback } from 'react';
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import StatusBadge from './project-details/StatusBadge';
import { BiSolidCategory } from "react-icons/bi";
import { Link } from 'react-router-dom';

const App = ({ projects }) => {

    const [currentSlideIndex, setCurrentSlideIndex] = useState(1);
    const totalSlides = projects.length;


    const previous = useCallback(() => {
        setCurrentSlideIndex((prevIndex) => {

            return prevIndex > 1 ? prevIndex - 1 : totalSlides;
        });
    }, [totalSlides]);


    const next = useCallback(() => {
        setCurrentSlideIndex((prevIndex) => {

            return prevIndex < totalSlides ? prevIndex + 1 : 1;
        });
    }, [totalSlides]);

    const buttonClasses = "absolute top-1/2 z-20 flex rounded-full -translate-y-1/2 items-center justify-center p-3 text-white transition duration-300 shadow-lg";
    const buttonHoverClasses = "bg-black/40 hover:bg-black/60 focus:ring-4 focus:ring-white/50";

    return (
        <>
            {projects && (
                <div>
                    <div className='flex text-3xl mb-2 text-gray-700 dark:text-gray-300'>
                        <BiSolidCategory className='mr-3' />
                        <h1> Similar Projects:</h1>
                    </div>
                    <p className="max-w-2xl mb-2 font-light text-gray-500 dark:text-gray-400 lg:mb-8 md:text-lg lg:text-xl 400">
                        Similar Projects in terms of topics and keywords
                    </p>

                    <div className="flex items-center justify-center  sm:p-8 font-inter">
                        <div className="relative w-full max-w-4xl lg:max-w-7xl overflow-hidden rounded-xl shadow">

                            <button
                                type="button"
                                className={`${buttonClasses} ${buttonHoverClasses} left-5`}
                                aria-label="previous slide"
                                onClick={previous}
                            >
                                <IoIosArrowBack className="size-5 md:size-6 pr-0.5" />
                            </button>

                            <button
                                type="button"
                                className={`${buttonClasses} ${buttonHoverClasses} right-5`}
                                aria-label="next slide"
                                onClick={next}
                            >
                                <IoIosArrowForward className="size-5 md:size-6 pl-0.5" />
                            </button>

                            <div className="relative lg:min-h-[45svh] min-h-[75svh] w-full">
                                {projects.map((slide, index) => {
                                    const slideNumber = index + 1;
                                    const isActive = currentSlideIndex === slideNumber;

                                    return (
                                        <div
                                            key={index}
                                            className={`absolute inset-0 transition-opacity shadow bg-gradient-to-r from-gray-200 to-gray-100 dark:bg-gradient-to-r dark:from-gray-800 dark:to-gray-900 duration-1000 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                            style={{ zIndex: isActive ? 10 : 0 }}
                                            aria-hidden={!isActive}
                                        >

                                            <Link to={`/project/${slide.id}`} state={{ slide }} >
                                                <div className="relative flex flex-col ">
                                                    <StatusBadge status={slide.status} />

                                                    <div className="p-4 lg:px-32">
                                                        <span className="text-slate-800 dark:text-slate-200 font-semibold">{slide.acronym}</span>

                                                        <p className="text-slate-800 dark:text-slate-200 leading-normal font-light line-clamp-4 h-11">
                                                            {slide.title}
                                                        </p>
                                                    </div>

                                                    <div className="lg:flex items-center justify-between p-4 lg:px-32">
                                                        <div className="lg:w-1/4 flex items-center">
                                                            <div className="flex flex-col text-sm">
                                                                {/* <div className="mb-2 text-slate-800 dark:text-slate-200 text-base">
                                                    EU Contribution: <span className='text-slate-800 dark:text-slate-200 font-semibold'>{slide.eu_contribution?.toLocaleString('en-US', { style: 'currency', currency: 'EUR' })}</span>
                                                </div> */}
                                                                <span className="text-slate-600 dark:text-slate-100">
                                                                    ID:  {slide.id}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {slide.keywords && (
                                                            <div className="lg:w-3/4 py-3  last:border-b-0">
                                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Keywords</p>
                                                                <div className="flex flex-wrap gap-2">
                                                                    {slide.keywords.split(",").map((keyword, index) => (
                                                                        <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                                            {keyword.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>

                                        </div>
                                    );
                                })}
                            </div>

                            <div className="absolute rounded-full bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-3 px-3 py-2 bg-black/20 backdrop-blur-sm" role="group" aria-label="slides">
                                {projects.map((_, index) => {
                                    const slideNumber = index + 1;
                                    const isCurrent = currentSlideIndex === slideNumber;
                                    return (
                                        <button
                                            key={index}
                                            className={`size-2.5 rounded-full transition-all duration-300 ${isCurrent ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/70'}`}
                                            onClick={() => setCurrentSlideIndex(slideNumber)}
                                            aria-label={`slide ${slideNumber}`}
                                            aria-current={isCurrent ? 'true' : 'false'}
                                        />
                                    );
                                })}
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default App;
