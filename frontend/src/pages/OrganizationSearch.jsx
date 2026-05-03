import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ReactCountryFlag from 'react-country-flag';
import { getCode } from 'country-list';
import { useQuery } from '@tanstack/react-query';

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

const OrganizationSearch = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!query.trim()) {
            setResults([]);
            setTotal(0);
            setHasSearched(false);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        debounceRef.current = setTimeout(() => {
            fetchOrgs(query.trim(), 1, false);
        }, 500);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const fetchOrgs = async (q, pageNum, append) => {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        try {
            setIsLoading(true);
            const { data } = await client.get('/organizations/search', {
                params: { q, page: pageNum, per_page: 15 },
                signal: abortRef.current.signal,
            });
            setResults(prev => append ? [...prev, ...data.organizations] : data.organizations);
            setTotal(data.total);
            setPages(data.pages);
            setPage(pageNum);
            setHasSearched(true);
        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'canceled') return;
            console.error('Org search error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLoadMore = () => fetchOrgs(query.trim(), page + 1, true);

    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-US', {
            style: 'currency', currency: 'EUR',
            notation: 'compact', maximumFractionDigits: 1,
        }).format(amount);
    };

    const { data: topOrgs = [], isLoading: topOrgsLoading } = useQuery({
        queryKey: ['stats-top-orgs'],
        queryFn: () => client.get('/organizations/stats/top-by-projects?limit=20').then(r => r.data),
        staleTime: 1000 * 60 * 10,
    });

    return (
        <div className="pt-28 min-h-screen px-4 max-w-4xl mx-auto">

            {/* Search input */}
            <div className="mb-6">
                <h1 className="text-2xl font-medium text-gray-800 dark:text-gray-200 mb-4">
                    Search Organizations
                </h1>
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search by name or organization ID..."
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-3"
                    autoFocus
                />
                {hasSearched && !isLoading && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        {total} organization{total !== 1 ? 's' : ''} found
                    </p>
                )}
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                </div>
            )}

            {/* Results */}
            {!isLoading && results.length > 0 && (
                <ul className="space-y-3">
                    {results.map(org => (
                        <li
                            key={org.organisationID}
                            onClick={() => navigate(`/org/${org.organisationID}`)}
                            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all"
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        {org.country && (
                                            <ReactCountryFlag
                                                countryCode={getCode(org.country) || org.country}
                                                svg
                                                style={{ width: '1.2em', height: '1.2em' }}
                                                title={org.country}
                                            />
                                        )}
                                        <span className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {org.name}
                                        </span>
                                        {org.sme === 'true' && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 flex-shrink-0">
                                                SME
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                        {org.organisationID} · {org.country}
                                    </p>
                                </div>

                                {/* Stats */}
                                <div className="flex gap-4 flex-shrink-0 text-right">
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Projects</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {org.total_projects}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">Coordinated</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {org.coordinated_projects}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 dark:text-gray-500">EU Funding</p>
                                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                            {formatCurrency(org.total_ec_contribution)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* No results */}
            {!isLoading && hasSearched && results.length === 0 && (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    No organizations found for "{query}"
                </div>
            )}

            {/* Load more */}
            {!isLoading && page < pages && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={handleLoadMore}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                    >
                        Load more
                    </button>
                </div>
            )}

            {/* Top organizations table */}
            <div className="mt-16 mb-8">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">
                    Top organizations by project participation
                </h2>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                    Click any row to view the organization detail
                </p>

                {topOrgsLoading ? (
                    <div className="space-y-2">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800 text-left">
                                    <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider w-8">#</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Organization</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Country</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Projects</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Coordinated</th>
                                    <th className="px-4 py-3 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">EU Funding</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {topOrgs.organizations?.map((org, i) => (
                                    <tr
                                        key={org.organisationID}
                                        onClick={() => navigate(`/org/${org.organisationID}`)}
                                        className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 text-gray-400 dark:text-gray-500">{i + 1}</td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium max-w-xs truncate">
                                            {org.name}
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-right">
                                            {org.country || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 text-right font-medium">
                                            {org.total_projects}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                                                {org.coordinated_projects}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-right">
                                            {formatCurrency(org.total_ec_contribution)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>


        </div>
    );
};

export default OrganizationSearch;