import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { getName } from 'country-list';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts';

const BASE = import.meta.env.VITE_API_BASE_URL;
const get = (path) => fetch(`${BASE}${path}`).then(r => r.json());

const STALE = 1000 * 60 * 10;

// ── colour palette ────────────────────────────────────────────────────────────
const BLUE   = '#378ADD';
const TEAL   = '#1D9E75';
const AMBER  = '#EF9F27';
const CORAL  = '#D85A30';
const PURPLE = '#7F77DD';
const PIE_COLORS = [BLUE, TEAL, AMBER, CORAL, PURPLE, '#639922', '#D4537E', '#888780', '#BA7517', '#0F6E56'];

// ── tiny helpers ──────────────────────────────────────────────────────────────
const fmt  = (n) => n == null ? 'N/A' : new Intl.NumberFormat('en-US').format(n);
const fmtM = (n) => {
    if (n == null) return 'N/A';
    if (n >= 1e9) return `€${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `€${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `€${(n / 1e3).toFixed(1)}K`;
    return `€${n}`;
};

// ── shared chart styles ───────────────────────────────────────────────────────
const axisStyle  = (dark) => ({ fill: dark ? '#9ca3af' : '#6b7280', fontSize: 12 });
const gridColor  = (dark) => dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
const tooltipStyle = (dark) => ({
    contentStyle: {
        background: dark ? '#1f2937' : '#ffffff',
        border: `0.5px solid ${dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
        borderRadius: 8, fontSize: 13,
    },
    labelStyle: { color: dark ? '#e5e7eb' : '#111827', fontWeight: 500 },
    itemStyle:  { color: dark ? '#d1d5db' : '#374151' },
});

// ── skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ h = 280 }) => (
    <div className="w-full animate-pulse bg-gray-100 dark:bg-gray-800 rounded-xl" style={{ height: h }} />
);

// ── error state ───────────────────────────────────────────────────────────────
const ChartError = ({ onRetry }) => (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 dark:text-gray-500">
        <p className="text-sm">Failed to load</p>
        <button onClick={onRetry} className="text-xs px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            Retry
        </button>
    </div>
);

// ── card wrapper ──────────────────────────────────────────────────────────────
const Card = ({ title, children, className = '' }) => (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 ${className}`}>
        {title && <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">{title}</h3>}
        {children}
    </div>
);

// ── stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, loading }) => (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5">
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{label}</p>
        {loading
            ? <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            : <p className="text-2xl font-medium text-gray-900 dark:text-gray-100">{value}</p>
        }
    </div>
);

// ── custom tooltip ────────────────────────────────────────────────────────────
const CurrencyTooltip = ({ active, payload, label, dark }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={tooltipStyle(dark).contentStyle} className="px-3 py-2">
            <p style={tooltipStyle(dark).labelStyle}>{label}</p>
            <p style={tooltipStyle(dark).itemStyle}>{fmtM(payload[0].value)}</p>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const Stats = () => {
    const { isDark } = useTheme();
    const axis = axisStyle(isDark);
    const grid = gridColor(isDark);
    const tip  = tooltipStyle(isDark);

    // ── queries ───────────────────────────────────────────────────────────────
    const summary = useQuery({ queryKey: ['stats-summary'],     queryFn: () => get('/projects/statistics/summary'), staleTime: STALE });
    const programme = useQuery({ queryKey: ['stats-programme'], queryFn: () => get('/stats/projects_per_programme'), staleTime: STALE });
    const years     = useQuery({ queryKey: ['stats-years'],     queryFn: () => get('/stats/projects_over_time'),    staleTime: STALE });
    const country   = useQuery({ queryKey: ['stats-country'],   queryFn: () => get('/stats/projects_by_country'),   staleTime: STALE });
    const funding   = useQuery({ queryKey: ['stats-funding'],   queryFn: () => get('/stats/eu_contribution_per_country'), staleTime: STALE });
    const topProj   = useQuery({ queryKey: ['stats-top-proj'],  queryFn: () => get('/stats/top_projects_by_eu_contribution'), staleTime: STALE });
    const topOrgs   = useQuery({ queryKey: ['stats-top-orgs'],  queryFn: () => get('/stats/top_organizations'),     staleTime: STALE });

    // ── data transforms ───────────────────────────────────────────────────────
    const programmeData = (programme.data || [])
        .sort((a, b) => b.project_count - a.project_count)
        .slice(0, 12)
        .map(d => ({ name: d.programme || 'Unknown', count: d.project_count }));

    const yearsData = (years.data || [])
        .filter(d => d.year && d.year >= '2000')
        .sort((a, b) => a.year.localeCompare(b.year))
        .map(d => ({ year: d.year, count: d.project_count }));

    const countryData = (country.data || [])
        .map(d => ({ name: getName(d.country)?.slice(0, 12) || d.country || 'Unknown', count: d.project_count }));

    const fundingData = (funding.data || [])
        .map(d => ({ name: getName(d.country)?.slice(0, 12) || d.country || 'Unknown', amount: d.total_eu_contribution }));

    const topProjData = (topProj.data || [])
        .map(d => ({ name: d.acronym || 'N/A', amount: d.eu_contribution }));

    const topOrgsData = (topOrgs.data || [])
        .map(d => ({ name: d.organization?.slice(0, 18) || 'N/A', count: d.project_count }));

    const s = summary.data;
    const statusData = s?.status_counts
        ? Object.entries(s.status_counts).map(([k, v]) => ({ name: k.toUpperCase(), value: v }))
        : [];

    return (
        <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto min-h-screen">

            {/* Page header */}
            <div className="mb-8">
                <h1 className="text-2xl font-medium text-gray-900 dark:text-gray-100">
                    EU Research Projects — Statistics
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Live overview of CORDIS funded projects and organizations
                </p>
            </div>

            {/* Summary stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Total Projects"   value={fmt(s?.total_projects)}       loading={summary.isLoading} />
                <StatCard label="Total EU Funding" value={fmtM(s?.total_contribution)}  loading={summary.isLoading} />
                <StatCard label="Countries"        value={fmt(s?.countries_involved)}   loading={summary.isLoading} />
                <StatCard label="Organizations"    value={fmt(s?.organizations_count)}  loading={summary.isLoading} />
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Projects over time — full width */}
                <Card title="Projects started per year" className="lg:col-span-2">
                    {years.isLoading ? <Skeleton h={240} /> : years.isError ? <div className="h-60"><ChartError onRetry={() => years.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={240}>
                            <LineChart data={yearsData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                                <XAxis dataKey="year" tick={axis} interval={2} />
                                <YAxis tick={axis} width={45} />
                                <Tooltip {...tip} formatter={(v) => [fmt(v), 'Projects']} />
                                <Line type="monotone" dataKey="count" stroke={BLUE} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Projects per programme */}
                <Card title="Projects per framework programme">
                    {programme.isLoading ? <Skeleton h={280} /> : programme.isError ? <div className="h-72"><ChartError onRetry={() => programme.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={programmeData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                                <XAxis type="number" tick={axis} />
                                <YAxis type="category" dataKey="name" tick={{ ...axis, fontSize: 11 }} width={80} />
                                <Tooltip {...tip} formatter={(v) => [fmt(v), 'Projects']} />
                                <Bar dataKey="count" fill={BLUE} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Projects by country */}
                <Card title="Top countries by project count">
                    {country.isLoading ? <Skeleton h={280} /> : country.isError ? <div className="h-72"><ChartError onRetry={() => country.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={countryData} margin={{ top: 0, right: 16, left: 0, bottom: 32 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                                <XAxis dataKey="name" tick={{ ...axis, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                                <YAxis tick={axis} width={45} />
                                <Tooltip {...tip} formatter={(v) => [fmt(v), 'Projects']} />
                                <Bar dataKey="count" fill={TEAL} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* EU Funding per country */}
                <Card title="EU contribution by country">
                    {funding.isLoading ? <Skeleton h={280} /> : funding.isError ? <div className="h-72"><ChartError onRetry={() => funding.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={fundingData} margin={{ top: 0, right: 16, left: 0, bottom: 32 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                                <XAxis dataKey="name" tick={{ ...axis, fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                                <YAxis tick={axis} width={55} tickFormatter={fmtM} />
                                <Tooltip content={<CurrencyTooltip dark={isDark} />} />
                                <Bar dataKey="amount" fill={AMBER} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Project status breakdown */}
                <Card title="Projects by status">
                    {summary.isLoading ? <Skeleton h={280} /> : summary.isError ? <div className="h-72"><ChartError onRetry={() => summary.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} paddingAngle={2}>
                                    {statusData.map((_, i) => (
                                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip {...tip} formatter={(v, n) => [fmt(v), n]} />
                                <Legend formatter={(v) => <span style={{ color: isDark ? '#d1d5db' : '#374151', fontSize: 12 }}>{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Top projects by EU contribution */}
                <Card title="Top 15 projects by EU contribution">
                    {topProj.isLoading ? <Skeleton h={320} /> : topProj.isError ? <div className="h-80"><ChartError onRetry={() => topProj.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={topProjData} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
                                <XAxis type="number" tick={axis} tickFormatter={fmtM} />
                                <YAxis type="category" dataKey="name" tick={{ ...axis, fontSize: 11 }} width={90} />
                                <Tooltip content={<CurrencyTooltip dark={isDark} />} />
                                <Bar dataKey="amount" fill={CORAL} radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Top organizations by project count — full width */}
                <Card title="Top organizations by project participation" className="lg:col-span-2">
                    {topOrgs.isLoading ? <Skeleton h={260} /> : topOrgs.isError ? <div className="h-64"><ChartError onRetry={() => topOrgs.refetch()} /></div> : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={topOrgsData} margin={{ top: 0, right: 16, left: 0, bottom: 60 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={grid} />
                                <XAxis dataKey="name" tick={{ ...axis, fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                                <YAxis tick={axis} width={40} />
                                <Tooltip {...tip} formatter={(v) => [fmt(v), 'Projects']} />
                                <Bar dataKey="count" fill={PURPLE} radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

            </div>
        </div>
    );
};

export default Stats;