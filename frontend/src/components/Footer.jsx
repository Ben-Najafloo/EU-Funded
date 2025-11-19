import React from 'react';
import { Link } from 'react-router-dom';
import {
    FaEnvelope,
    // FaGithub,
    // FaTwitter,
    // FaLinkedin,
    FaInfoCircle,
    FaBook,
    FaShieldAlt,
    FaGlobeEurope
} from 'react-icons/fa';

const Footer = () => {
    return (
        <footer className="border-t-2 border-gray-400 text-black mt-16 px-5 dark:bg-gray-900">
            {/* Main Footer Content */}
            <div className="container mx-auto px-6 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

                    {/* About Section */}
                    <div className="col-span-1">
                        <Link to="/" onClick={() => { setSearchTerm('') }}
                    className='text-4xl hover:text-blue-600 cursor-pointer bg-gradient-to-r from-gray-800 to-blue-800 dark:from-white dark:to-blue-800 text-transparent bg-clip-text mb-2'
                >
                    NEXORA
                </Link>
                        <p className="text-gray-700 dark:text-gray-200 text-sm my-4 lg:pr-20">
                            A comprehensive tool for exploring and analyzing EU-funded research and innovation projects from the Cordis database with <span className='font-bold'>daily update</span>.
                        </p>
                    </div>

                    {/* Quick Links */}
                    <div className="col-span-1">
                        <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">Quick Links</h3>
                        <ul className="space-y-1">
                            <li>
                                <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors">
                                    Home
                                </Link>
                            </li>
                            <li>
                                <Link to="/recent" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors">
                                    New Projects
                                </Link>
                            </li>
                            <li>
                                <Link to="/expiring" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors">
                                    Expiring Projects
                                </Link>
                            </li>
                            <li>
                                <Link to="/stats" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors">
                                    Statistics
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div className="col-span-1">
                        <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">Resources</h3>
                        <ul className="space-y-2">
                            <li>
                                <a href="#" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors flex items-center">
                                    <FaBook className="mr-2" />
                                    Documentation
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors flex items-center">
                                    <FaInfoCircle className="mr-2" />
                                    About EU Funding
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors flex items-center">
                                    <FaGlobeEurope className="mr-2" />
                                    EU Research Programs
                                </a>
                            </li>
                            <li>
                                <a href="#" className="text-gray-700 dark:text-gray-200 hover:text-blue-500 text-sm transition-colors flex items-center">
                                    <FaShieldAlt className="mr-2" />
                                    API Access
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Contact & Legal */}
                    <div className="col-span-1">
                        <h3 className="text-lg font-semibold mb-4 dark:text-gray-200">Contact</h3>
                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-200">
                            <p className="flex items-center">
                                <FaEnvelope className="mr-2" />
                                marjan.saadatpanah@magellancircle.eu
                            </p>
                            <p>Magellan Circle</p>
                            <p>16121 Genoa, Italy</p>
                        </div>

                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-gray-700">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <p className="text-gray-800 dark:text-gray-300 text-sm">
                            © {new Date().getFullYear()} NEXORA. This platform is not officially affiliated with the European Commission.
                        </p>
                        <p className="text-gray-800 dark:text-gray-300 text-sm mt-2 md:mt-0">
                            Data source: <a
                                href="https://cordis.europa.eu/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-blue-500 transition-colors"
                            >
                                Cordis EU
                            </a>
                        </p>
                    </div>
                </div>
            </div>

        </footer>
    );
};

export default Footer;
