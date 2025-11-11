import { Suspense } from 'react';
import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { GetProjectById } from '../services/api';
import { addToHistory } from '../services/userApi';
import { SearchContext } from '../contexts/SearchContext';
import { useAuth } from '@clerk/clerk-react';

import { FaArrowLeftLong } from "react-icons/fa6";
import { FaCrown, FaHandshake, FaGlobe } from "react-icons/fa6";
import { BsPeopleFill } from "react-icons/bs";

import Organization from '../components/project-details/Organization';
import Project from '../components/project-details/Project';
import SimilarProjects from '../components/SimilarProjects';

const ProjectDetails = () => {
    const { isLoading, setIsLoading } = useContext(SearchContext);
    const { getToken, isSignedIn } = useAuth();
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [similarProjects, setSimilarProjects] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (location.state?.project) {
            setProject(location.state.project);
            setSimilarProjects(location.state.similars);
            setIsLoading(false);
        } else {
            const fetchProject = async () => {
                try {
                    setIsLoading(true);
                    const data = await GetProjectById(id);
                    setProject(data);
                } catch (err) {
                    console.error('Error fetching project:', err);
                    setError('Failed to fetch project details');
                } finally {
                    setIsLoading(false);
                }
            };
            fetchProject();
        }
    }, [id, location.state, setIsLoading]);

    // Track project view in history (only for signed-in users)
    useEffect(() => {
        const trackHistory = async () => {
            if (isSignedIn && id) {
                try {
                    await addToHistory(getToken, id);
                    console.log('Project view tracked in history');
                } catch (error) {
                    console.error('Failed to track history:', error);
                    // Silently fail - don't disrupt user experience
                }
            }
        };

        trackHistory();
    }, [id, isSignedIn, getToken]);

    const similarProjectsList = similarProjects.filter(
        (similarProject) => similarProject.id !== project.id
    );

    const handleBack = () => {
        if (location.state?.projectList && location.state?.searchTerm) {
            navigate('/', { state: location.state });
        } else {
            navigate(-1);
        }
    };

    // Helper function to normalize role names for comparison
    const normalizeRole = (role) => {
        if (!role) return '';
        return role.toLowerCase()
            .replace(/[\s_-]+/g, '') // Remove spaces, underscores, hyphens
            .trim();
    };

    // Helper function to check if a role matches any of the expected variations
    const isRoleMatch = (role, expectedRoles) => {
        const normalizedRole = normalizeRole(role);
        return expectedRoles.some(expectedRole =>
            normalizedRole === normalizeRole(expectedRole) ||
            normalizedRole.includes(normalizeRole(expectedRole)) ||
            normalizeRole(expectedRole).includes(normalizedRole)
        );
    };

    if (isLoading) return <p>Loading...</p>;
    if (error) return <p>{error}</p>;
    if (!project) return <p>No project found</p>;

    const participants = project.organizations?.filter(org =>
        isRoleMatch(org.role, ['participant', 'participants'])
    );

    const associatedPartners = project.organizations?.filter(org =>
        isRoleMatch(org.role, [
            'associatedPartner',
            'associated partner',
            'associatedpartner',
            'associated_partner',
            'associated-partner'
        ])
    );

    const thirdParties = project.organizations?.filter(org =>
        isRoleMatch(org.role, [
            'thirdParty',
            'third party',
            'thirdparty',
            'third_party',
            'third-party'
        ])
    );


    // Find the coordinator from the organizations array
    const coordinator = project.coordinator ? [project.coordinator] : [];


    return (
        <>
            <Suspense fullback={<h1>Loading project details...</h1>}>
                <div className="lg:flex py-5 pt-25 rounded space-y-3 border-t-2 border-gray-300">
                    <button
                        onClick={handleBack}
                        className="hidden sm:block fixed pt-20 h-96 text-gray-800 dark:text-gray-300 hover:text-blue-500 cursor-pointer focus:ring-4 focus:outline-none focus:ring-black font-medium text-base px-7">
                        <span className='text-sm'>Back</span>
                        <FaArrowLeftLong className="text-lg" />
                    </button>

                    <div className='lg:pl-24 min-h-screen'>
                        {/* project information */}
                        <Project project={project} />

                        {/* coordinator (conditionally rendered) */}
                        {coordinator && (
                            <Organization organizations={coordinator} title="Coordinated by" icon={FaCrown} />
                        )}

                        {/* Participant(s): (conditionally rendered) */}
                        {participants && participants.length > 0 && (
                            <Organization organizations={participants} title="Participant(s)" icon={FaHandshake} />
                        )}

                        {/* thirdParty(s): (conditionally rendered) */}
                        {thirdParties && thirdParties.length > 0 && (
                            <Organization organizations={thirdParties} title="Third Party(s)" icon={FaGlobe} />
                        )}

                        {/* associatedPartner(s): (conditionally rendered) */}
                        {associatedPartners && associatedPartners.length > 0 && (
                            <Organization organizations={associatedPartners} title="Partner(s)" icon={BsPeopleFill} />
                        )}

                        <div className='mt-40'>
                            <SimilarProjects projects={similarProjectsList} />
                        </div>
                    </div>
                </div >
            </Suspense>
        </>
    );
}

export default ProjectDetails;