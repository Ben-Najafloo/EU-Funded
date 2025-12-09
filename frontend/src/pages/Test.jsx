
import { DataGridPro } from '@mui/x-data-grid-pro';
import { useMockServer } from '@mui/x-data-grid-generator';
import React from 'react';

function Test() {
    const { fetchRows, editRow, ...props } = useMockServer(
        { rowLength: 100000, editable: true },
        { useCursorPagination: false, minDelay: 200, maxDelay: 500 },
    );

    const dataSource = React.useMemo(
        () => ({
            getRows: async (params) => {
                const urlParams = new URLSearchParams({
                    filterModel: JSON.stringify(params.filterModel),
                    sortModel: JSON.stringify(params.sortModel),
                    start: `${params.start}`,
                    end: `${params.end}`,
                });
                const getRowsResponse = await fetchRows(
                    `https://mui.com/x/api/data-grid?${urlParams.toString()}`,
                );
                //'http://localhost:5000/organizations'
                return {
                    rows: getRowsResponse.rows,
                    rowCount: getRowsResponse.rowCount,
                };
            },
            updateRow: async (params) => {
                const syncedRow = await editRow(params.rowId, params.updatedRow);
                return syncedRow;
            },
        }),
        [fetchRows, editRow],
    );

    return (
        <div style={{ width: '100%', height: 450 }} className='pt-32'>
            <DataGridPro
                {...props}
                dataSource={dataSource}
                lazyLoading
                paginationModel={{ page: 0, pageSize: 10 }}
            />
        </div>
    );
}

export default Test;