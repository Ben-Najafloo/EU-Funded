import { getName, getCodes } from "country-list";

const EU_COUNTRIES = [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
];

export const useCountrySelect = ({ filters, setFilters }) => {

    const countryOptions = [
        {
            value: 'EU_COUNTRIES',
            label: '🇪🇺 EU Countries',
            isEUOption: true
        },
        ...getCodes().map(code => ({
            value: code,
            label: getName(code),
            isEUOption: false
        }))
    ];

    const selectedOptions = countryOptions.filter(opt => {
        if (opt.value === 'EU_COUNTRIES') {
            return EU_COUNTRIES.every(euCountry => filters.selectedCountries.includes(euCountry));
        }
        const allEUSelected = EU_COUNTRIES.every(euCountry => filters.selectedCountries.includes(euCountry));
        const hasNonEUCountries = filters.selectedCountries.some(country => !EU_COUNTRIES.includes(country));

        if (allEUSelected && !hasNonEUCountries) {
            return false;
        }

        return filters.selectedCountries.includes(opt.value);
    });

    const handleCountryChange = (selected) => {
        if (!selected) {
            setFilters({
                ...filters,
                selectedCountries: []
            });
            return;
        }

        let newCountries = [];

        selected.forEach(option => {
            if (option.value === 'EU_COUNTRIES') {
                // Add all EU countries
                newCountries = [...new Set([...newCountries, ...EU_COUNTRIES])];
            } else if (!option.isEUOption) {
                // Add individual country
                newCountries = [...new Set([...newCountries, option.value])];
            }
        });

        setFilters({
            ...filters,
            selectedCountries: newCountries
        });
    };
    return {
        selectedOptions,
        handleCountryChange,
        countryOptions
    }
}


