import { useState } from 'react';
import { getName } from 'country-list';

export const useProjectExport = () => {
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);

    // CSV Helper Functions
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
            ['Topics', cleanCSVValue(data.topics)],
            ['Keywords', cleanCSVValue(data.keywords)],
            ['Objective', cleanCSVValue(objective)],
            ['Coordinator Name', cleanCSVValue(data.coordinator?.name)],
            ['Number of Projects', cleanCSVValue(data.coordinator?.project_count)],
            ['Number of Coordinating', cleanCSVValue(data.coordinator?.coordinator_count)],
            ['Coordinator Country', cleanCSVValue(data.coordinator?.country ? getName(data.coordinator.country) : '')],
            ['Coordinator Organization URL', cleanCSVValue(data.coordinator?.organizationURL)],
        ];

        // Convert project info to CSV
        let csvContent = 'PROJECT INFORMATION\n';
        csvContent += projectInfo.map(row => row.join(',')).join('\n');

        // Add organizations as separate section if they exist
        if (data.organizations && data.organizations.length > 0) {
            csvContent += '\n\n'; // Empty lines for separation
            csvContent += 'OTHER ORGANIZATIONS\n';

            const orgHeaders = [
                'Role',
                'Name',
                'Number of Project',
                'Number of Coordinating',
                'Country',
                'SME',
                'Net EC Contribution (EUR)',
                'Total Cost (EUR)',
                'Organization URL',
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
                    cleanCSVValue(org.role),
                    cleanCSVValue(org.name),
                    cleanCSVValue(org.project_count),
                    cleanCSVValue(org.coordinator_count),
                    cleanCSVValue(getName(org.country)),
                    cleanCSVValue(org.SME),
                    cleanCSVValue(org.netEcContribution),
                    cleanCSVValue(org.totalCost),
                    cleanCSVValue(org.organizationURL),
                ];
                csvContent += orgRow.join(',') + '\n';
            });
        }

        return csvContent;
    };

    const exportSelectedProjects = (allProjects, onSuccess, onError) => {
        if (selectedProjectIds.length === 0) {
            onError?.('Please select at least one project');
            return;
        }

        try {
            const selectedProjects = allProjects.filter(p => selectedProjectIds.includes(p.id));

            // LOG THE DATA STRUCTURE (optional - can be removed in production)
            if (selectedProjects.length > 0) {
            }

            let combinedCSV = '';

            selectedProjects.forEach((project, index) => {

                if (index > 0) {
                    combinedCSV += '\n\n' + '='.repeat(80) + '\n\n';
                }
                combinedCSV += convertToCSV(project);
            });


            const BOM = '\uFEFF';
            const blob = new Blob([BOM + combinedCSV], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const filename = selectedProjectIds.length === 1
                ? `${selectedProjects[0].acronym || 'project'}_${selectedProjects[0].id}.csv`
                : `projects_export_${selectedProjectIds.length}_items.csv`;

            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            onSuccess?.(selectedProjectIds.length);
            setSelectedProjectIds([]);
        } catch (error) {
            console.error('Error exporting projects:', error);
            onError?.('Failed to export projects');
        }
    };

    const toggleProjectSelection = (projectId) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(projectId)) {
                return prev.filter(id => id !== projectId);
            } else {
                return [...prev, projectId];
            }
        });
    };

    const toggleSelectAll = (projects) => {
        if (selectedProjectIds.length === projects.length) {
            setSelectedProjectIds([]);
        } else {
            setSelectedProjectIds(projects.map(p => p.id));
        }
    };

    /**
     * Clear all selections
     */
    const clearSelection = () => {
        setSelectedProjectIds([]);
    };

    const isProjectSelected = (projectId) => {
        return selectedProjectIds.includes(projectId);
    };

    return {
        selectedProjectIds,
        toggleProjectSelection,
        toggleSelectAll,
        clearSelection,
        isProjectSelected,
        exportSelectedProjects,
    };
};