import { useState } from 'react';
import { BiDownload } from 'react-icons/bi';
import { getName } from 'country-list';

const cleanCSVValue = (value) => {
    if (value === null || value === undefined) return '';

    let stringValue;

    // Handle objects and arrays
    if (typeof value === 'object' || Array.isArray(value)) {
        stringValue = JSON.stringify(value);
    } else {
        stringValue = String(value);
    }

    // Remove line breaks
    stringValue = stringValue.replace(/(\r\n|\n|\r)/gm, ' ');

    // Escape quotes and wrap in quotes if contains comma or quote
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        stringValue = stringValue.replace(/"/g, '""');
        return `"${stringValue}"`;
    }

    return stringValue;
};

const convertToCSV = (data) => {
    // Find coordinator
    const coordinator = Array.isArray(data.organizations)
        ? data.organizations.find(org => org.role?.toLowerCase() === 'coordinator') || {}
        : data.coordinator || {};

    // Get objective (handle both full text and summary)
    const objective = data.objective_data?.summary || data.objective || '';

    // Create vertical structure for main project info
    const projectInfo = [
        ['', ''],
        ['Project ID', cleanCSVValue(data.id || data.projectID || data._id)],
        ['Acronym', cleanCSVValue(data.acronym)],
        ['Title', cleanCSVValue(data.title)],
        ['Status', cleanCSVValue(data.status)],
        ['Start Date', cleanCSVValue(data.startDate)],
        ['End Date', cleanCSVValue(data.endDate)],
        ['Signature Date', cleanCSVValue(data.ecSignatureDate)],
        ['Total Cost (EUR)', cleanCSVValue(data.totalCost)],
        ['EU Contribution (EUR)', cleanCSVValue(data.ecMaxContribution || data.eu_contribution || data.ecContribution)],
        // ['Funding Scheme', cleanCSVValue(data.fundingScheme)],
        // ['Legal Basis', cleanCSVValue(data.legalBasis)],
        // ['Framework Programme', cleanCSVValue(data.frameworkProgramme)],
        ['Topics', cleanCSVValue(data.topics)],
        // ['Master Call', cleanCSVValue(data.masterCall)],
        // ['Sub Call', cleanCSVValue(data.subCall)],
        ['Keywords', cleanCSVValue(data.keywords)],
        ['Objective', cleanCSVValue(objective)],
        ['Coordinator Name', cleanCSVValue(data.coordinator.name)],
        ['Number of Projects', cleanCSVValue(data.coordinator.project_count)],
        ['Number of Coordinating', cleanCSVValue(data.coordinator.coordinator_count)],
        // ['Coordinator Short Name', cleanCSVValue(data.coordinator.shortName)],
        // ['Coordinator City', cleanCSVValue(data.coordinator.city)],
        ['Coordinator Country', cleanCSVValue(getName(data.coordinator.country))],
        // ['Coordinator Street', cleanCSVValue(data.coordinator.street)],
        // ['Coordinator Post Code', cleanCSVValue(data.coordinator.postCode)],
        ['Coordinator Organization URL', cleanCSVValue(data.coordinator.organizationURL)],
        // ['Number of Organizations', cleanCSVValue(data.organizations ? data.organizations.length : 0)]
    ];

    // Convert project info to CSV
    let csvContent = 'PROJECT INFORMATION\n';

    csvContent += projectInfo.map(row => row.join(',')).join('\n');


    // Add organizations as separate section if they exist
    if (data.organizations && data.organizations.length > 0) {
        csvContent += '\n\n'; // Empty lines for separation
        csvContent += 'OTHER ORGANIZATIONS\n';

        const orgHeaders = [
            // 'Order',
            'Role',
            'Name',
            'Number of Project',
            'Number of Coordinating',
            // 'Short Name',
            // 'City',
            'Country',
            // 'Post Code',
            // 'Street',
            // 'Activity Type',
            'SME',
            // 'EC Contribution (EUR)',
            'Net EC Contribution (EUR)',
            'Total Cost (EUR)',
            'Organization URL',
            // 'VAT Number',
            // 'Contact Form'
        ];

        csvContent += orgHeaders.join(',') + '\n';

        // Sort organizations by order if available
        const sortedOrgs = [...data.organizations].sort((a, b) => {
            const orderA = parseInt(a.order) || 999;
            const orderB = parseInt(b.order) || 999;
            return orderA - orderB;
        });

        sortedOrgs.forEach(org => {
            const orgRow = [
                // cleanCSVValue(org.order),
                cleanCSVValue(org.role),
                cleanCSVValue(org.name),
                cleanCSVValue(org.project_count),
                cleanCSVValue(org.coordinator_count),
                // cleanCSVValue(org.shortName),
                // cleanCSVValue(org.city),
                cleanCSVValue(getName(org.country)),
                // cleanCSVValue(org.postCode),
                // cleanCSVValue(org.street),
                // cleanCSVValue(org.activityType),
                cleanCSVValue(org.SME),
                // cleanCSVValue(org.ecContribution),
                cleanCSVValue(org.netEcContribution),
                cleanCSVValue(org.totalCost),
                cleanCSVValue(org.organizationURL),
                // cleanCSVValue(org.vatNumber),
                // cleanCSVValue(org.contactForm)
            ];
            csvContent += orgRow.join(',') + '\n';
        });
    }

    // Add extracted keywords if available
    // if (data.extracted_keywords && data.extracted_keywords.length > 0) {
    //     csvContent += '\n\n';
    //     csvContent += 'EXTRACTED KEYWORDS\n';
    //     csvContent += 'Keyword\n';
    //     data.extracted_keywords.forEach(keyword => {
    //         csvContent += cleanCSVValue(keyword) + '\n';
    //     });
    // }

    return csvContent;
};

const DownloadProject = ({ project }) => {
    const [status, setStatus] = useState(null);

    const handleDownloadCSV = () => {
        if (!project) {
            setStatus('No project data available');
            setTimeout(() => setStatus(null), 3000);
            return;
        }

        setStatus('Generating file...');

        try {
            const csvContent = convertToCSV(project);

            // Add BOM for proper UTF-8 encoding in Excel
            const BOM = '\uFEFF';
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const filename = `${project.acronym || 'project'}_${project.id || 'data'}.csv`;
            a.download = filename;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setStatus(`✓ Downloaded ${filename}`);
            setTimeout(() => setStatus(null), 3000);

        } catch (error) {
            console.error("Error generating or downloading CSV:", error);
            setStatus('✗ Error: Could not generate CSV');
            setTimeout(() => setStatus(null), 3000);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={handleDownloadCSV}
                className="flex items-center px-3 py-1 bg-green-500 text-white text-sm rounded shadow hover:bg-green-600 transition duration-150"
                aria-label="Download project data as CSV"
            >
                <BiDownload className="w-5 h-5 mr-2" />
                Download (CSV)
            </button>
            {status && (
                <div className="absolute right-0 top-full mt-1 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-10 whitespace-nowrap">
                    {status}
                </div>
            )}
        </div>
    );
};

export default DownloadProject;