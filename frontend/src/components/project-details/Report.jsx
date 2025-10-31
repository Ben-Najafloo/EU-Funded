import { useState } from 'react';
import { BiDownload } from 'react-icons/bi';

const ProjectReport = ({ project }) => {
    const [status, setStatus] = useState(null);

    if (!project) return null;

    // Find coordinator
    const coordinator = Array.isArray(project.organizations)
        ? project.organizations.find(org => org.role?.toLowerCase() === 'coordinator') || {}
        : project.coordinator || {};

    // Get participants (non-coordinators)
    const participants = Array.isArray(project.organizations)
        ? project.organizations.filter(org => org.role?.toLowerCase() !== 'coordinator')
        : [];

    // Get objective
    const objective = project.objective_data?.summary || project.objective || 'No objective available';

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return 'N/A';
        return new Intl.NumberFormat('en-EU', {
            style: 'currency',
            currency: 'EUR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Calculate project duration
    const calculateDuration = () => {
        if (!project.startDate || !project.endDate) return 'N/A';
        const start = new Date(project.startDate);
        const end = new Date(project.endDate);
        const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30));
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if (years > 0) {
            return `${years} year${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}` : ''}`;
        }
        return `${months} month${months > 1 ? 's' : ''}`;
    };

    // Get country distribution
    const getCountryStats = () => {
        if (!project.organizations) return {};
        const countries = {};
        project.organizations.forEach(org => {
            if (org.country) {
                countries[org.country] = (countries[org.country] || 0) + 1;
            }
        });
        return countries;
    };

    const countryStats = getCountryStats();

    // Generate HTML report content optimized for PDF conversion
    const generateReportHTML = () => {
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.acronym} - Project Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { 
            size: A4; 
            margin: 15mm;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
        }
        .header {
            border-bottom: 4px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            page-break-after: avoid;
        }
        .header h1 {
            color: #2563eb;
            font-size: 24px;
            margin-bottom: 10px;
            line-height: 1.3;
        }
        .header .acronym {
            font-size: 32px;
            font-weight: bold;
            color: #1e40af;
            margin-bottom: 8px;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            background: #10b981;
            color: white;
            border-radius: 15px;
            font-size: 13px;
            font-weight: 600;
            margin-top: 8px;
        }
        .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 18px;
            color: #1e40af;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 8px;
            margin-bottom: 12px;
            font-weight: 600;
            page-break-after: avoid;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 15px;
        }
        .info-item {
            padding: 10px;
            background: #f9fafb;
            border-left: 3px solid #2563eb;
        }
        .info-label {
            font-size: 11px;
            color: #6b7280;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .info-value {
            font-size: 15px;
            color: #111827;
            font-weight: 500;
        }
        .objective-text {
            background: #f0f9ff;
            padding: 15px;
            border-left: 4px solid #3b82f6;
            line-height: 1.7;
            text-align: justify;
            color: #1e3a8a;
            font-size: 14px;
        }
        .org-card {
            background: #f9fafb;
            padding: 12px;
            margin-bottom: 8px;
            border-left: 4px solid #10b981;
            page-break-inside: avoid;
        }
        .org-card.coordinator {
            border-left-color: #2563eb;
            background: #eff6ff;
        }
        .org-name {
            font-weight: 600;
            color: #111827;
            font-size: 14px;
            margin-bottom: 4px;
        }
        .org-details {
            font-size: 13px;
            color: #6b7280;
        }
        .org-role {
            display: inline-block;
            padding: 2px 8px;
            background: #2563eb;
            color: white;
            border-radius: 10px;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
            margin-right: 6px;
        }
        .country-badge {
            display: inline-block;
            padding: 2px 8px;
            background: #e5e7eb;
            border-radius: 8px;
            font-size: 11px;
            margin-right: 4px;
            margin-bottom: 4px;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 11px;
            page-break-before: avoid;
        }
        .keywords {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .keyword-tag {
            padding: 5px 10px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 12px;
            font-size: 12px;
        }
        @media print {
            body { padding: 0; }
            .container { max-width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="acronym">${project.acronym || 'N/A'}</div>
            <h1>${project.title || 'Untitled Project'}</h1>
            <span class="status-badge">${project.status || 'N/A'}</span>
        </div>

        <div class="section">
            <h2 class="section-title">Project Overview</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Project ID</div>
                    <div class="info-value">${project.id || project.projectID || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Framework Programme</div>
                    <div class="info-value">${project.frameworkProgramme || 'N/A'}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Start Date</div>
                    <div class="info-value">${formatDate(project.startDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">End Date</div>
                    <div class="info-value">${formatDate(project.endDate)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Duration</div>
                    <div class="info-value">${calculateDuration()}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">Funding Scheme</div>
                    <div class="info-value">${project.fundingScheme || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Budget</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="info-label">Total Cost</div>
                    <div class="info-value">${formatCurrency(project.totalCost)}</div>
                </div>
                <div class="info-item">
                    <div class="info-label">EU Contribution</div>
                    <div class="info-value">${formatCurrency(project.ecMaxContribution || project.ecContribution)}</div>
                </div>
            </div>
        </div>

        ${project.keywords ? `
        <div class="section">
            <h2 class="section-title">Keywords</h2>
            <div class="keywords">
                ${project.keywords.split(',').map(kw => `<span class="keyword-tag">${kw.trim()}</span>`).join('')}
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2 class="section-title">Project Objective</h2>
            <div class="objective-text">
                ${objective}
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Coordinator</h2>
            <div class="org-card coordinator">
                <div class="org-role">Coordinator</div>
                <div class="org-name">${coordinator.name || 'N/A'}</div>
                <div class="org-details">
                    📍 ${coordinator.city || 'N/A'}, ${coordinator.country || 'N/A'}
                    ${coordinator.organizationURL ? `<br>🌐 ${coordinator.organizationURL}` : ''}
                </div>
            </div>
        </div>

        <div class="section">
            <h2 class="section-title">Partner Organizations (${participants.length})</h2>
            <div style="margin-bottom: 12px; font-size: 13px;">
                <strong>Countries involved:</strong><br>
                ${Object.entries(countryStats).map(([country, count]) =>
            `<span class="country-badge">${country}: ${count}</span>`
        ).join('')}
            </div>
            ${participants.slice(0, 15).map(org => `
                <div class="org-card">
                    <div class="org-name">${org.name || 'N/A'}</div>
                    <div class="org-details">
                        📍 ${org.city || 'N/A'}, ${org.country || 'N/A'} | 
                        💰 ${formatCurrency(org.ecContribution)}
                    </div>
                </div>
            `).join('')}
            ${participants.length > 15 ? `<p style="color: #6b7280; font-style: italic; margin-top: 8px; font-size: 13px;">...and ${participants.length - 15} more partners</p>` : ''}
        </div>

        <div class="footer">
            Report generated on ${new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}
        </div>
    </div>
    
    <script>
        // Auto-trigger print dialog for PDF conversion
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
        `;
    };

    const handleDownloadReport = () => {
        setStatus('Generating report...');

        try {
            const htmlContent = generateReportHTML();
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            // Open in new window with print dialog
            const printWindow = window.open(url, '_blank');

            if (printWindow) {
                printWindow.onload = () => {
                    URL.revokeObjectURL(url);
                };
                setStatus('✓ Opening print dialog...');
            } else {
                // Fallback: download HTML file
                const a = document.createElement('a');
                a.href = url;
                a.download = `${project.acronym || 'project'}_report.html`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                setStatus('✓ Report downloaded! Open and print to PDF');
            }

            setTimeout(() => setStatus(null), 4000);
        } catch (error) {
            console.error('Error generating report:', error);
            setStatus('✗ Error generating report');
            setTimeout(() => setStatus(null), 3000);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleDownloadReport}
                className="flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded shadow hover:bg-blue-600 transition duration-150"
                aria-label="Generate project report PDF"
            >
                <BiDownload className="w-5 h-5 mr-2" />
                Download (PDF)
            </button>
            {status && (
                <div className="absolute right-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-10 whitespace-nowrap">
                    {status}
                </div>
            )}
        </div>

    );
};

export default ProjectReport;