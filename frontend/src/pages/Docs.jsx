import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart3, Search, Brain, Building2, UserCog, Layers } from "lucide-react";

export default function Docs() {
    return (
        <div className="min-h-screen bg-background text-foreground px-6 md:px-12 lg:px-24 py-25">
            {/* Hero Section */}
            <section className=" mx-auto text-center mb-20">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="text-4xl md:text-5xl font-bold tracking-tight mb-6"
                >

                </motion.h1>
                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                    <span
                        className='text-2xl mr-2 hover:text-blue-600 cursor-pointer bg-gradient-to-r from-gray-800 to-blue-800 dark:from-white dark:to-blue-800 text-transparent bg-clip-text'
                    >
                        NEXORA
                    </span>
                    is a funding intelligence and exploration platform designed to simplify
                    how EU-funded research and innovation projects are discovered, analyzed,
                    and evaluated. It transforms large-scale public funding data into a structured,
                    relevance-driven environment that supports informed decision-making.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="p-6 text-center">
                            <p className="text-3xl font-semibold">Live</p>
                            <p className="text-sm text-muted-foreground mt-2">Continuously Updated Data</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="p-6 text-center">
                            <p className="text-3xl font-semibold">Intelligent</p>
                            <p className="text-sm text-muted-foreground mt-2">Relevance-Based Search</p>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl shadow-sm">
                        <CardContent className="p-6 text-center">
                            <p className="text-3xl font-semibold">Analytical</p>
                            <p className="text-sm text-muted-foreground mt-2">Project & Organization Insights</p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Strategic Purpose */}
            <section className="max-w-4xl mx-auto mb-20">
                <h2 className="text-2xl font-semibold mb-6">Strategic Purpose</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                    The European funding landscape contains a vast amount of publicly accessible
                    project data. However, traditional portals emphasize listing over interpretation.
                    Users must manually refine queries, compare records, and extract insights with
                    limited analytical assistance.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                    Nexora was developed to reduce this friction. By embedding scoring logic,
                    structured filtering, AI-assisted summarization, and participation analytics
                    directly into the experience, the platform moves beyond static search and
                    enables guided discovery.
                </p>
            </section>

            {/* Core Capabilities */}
            <section className="max-w-6xl mx-auto mb-20">
                <h2 className="text-2xl font-semibold mb-10 text-center">Core Capabilities</h2>
                <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                    <FeatureCard
                        icon={<Search size={28} />}
                        title="Intelligent Search"
                        description="Weighted scoring prioritizes relevant results based on title, acronym, and contextual matches. Real-time updates and spell-check enhance precision."
                    />
                    <FeatureCard
                        icon={<Layers size={28} />}
                        title="Advanced Filtering"
                        description="Flexible filtering by identifiers, topics, countries, financial ranges, and timelines enables precise dataset segmentation."
                    />
                    <FeatureCard
                        icon={<Brain size={28} />}
                        title="Project Intelligence"
                        description="AI-generated summaries and structured timelines accelerate project evaluation while preserving key financial and program details."
                    />
                    <FeatureCard
                        icon={<Building2 size={28} />}
                        title="Organization Analytics"
                        description="Computed metrics reveal participation frequency, coordination roles, and financial involvement across the database."
                    />
                    <FeatureCard
                        icon={<UserCog size={28} />}
                        title="Personalization"
                        description="User profiles, saved projects, history tracking, and preference-based matching introduce adaptive exploration."
                    />
                    <FeatureCard
                        icon={<BarChart3 size={28} />}
                        title="Statistical Insights"
                        description="Aggregated charts and structured views provide macro-level visibility into funding distribution and project trends."
                    />
                </div>
            </section>

            {/* Differentiation */}
            <section className="max-w-4xl mx-auto mb-20">
                <h2 className="text-2xl font-semibold mb-6">What Differentiates Nexora</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                    Nexora integrates intelligence directly into the exploration process.
                    Rather than functioning as a passive repository, it applies structured
                    ranking logic, calculated participation metrics, and AI-supported
                    interpretation to enhance clarity and reduce manual effort.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                    The result is a funding intelligence environment that supports
                    partnership evaluation, opportunity monitoring, and strategic
                    positioning within EU research ecosystems.
                </p>
            </section>

            {/* Strategic Positioning */}
            <section className="max-w-4xl mx-auto text-center">
                <h2 className="text-2xl font-semibold mb-6">Platform Positioning</h2>
                <p className="text-muted-foreground leading-relaxed">
                    Nexora is positioned as a structured discovery and analysis system
                    for EU-funded research activities. It combines exploration, analytics,
                    and personalization within a unified interface, supporting both
                    operational use and strategic insight.
                </p>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
        >
            <Card className="rounded-2xl shadow-sm h-full">
                <CardContent className="p-6 flex flex-col gap-4">
                    <div className="text-primary">{icon}</div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </CardContent>
            </Card>
        </motion.div>
    );
}
