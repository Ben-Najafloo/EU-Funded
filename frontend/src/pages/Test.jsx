
// import { DataGridPro } from '@mui/x-data-grid-pro';
// import { useMockServer } from '@mui/x-data-grid-generator';
// import React from 'react';

// function Test() {
//     const { fetchRows, editRow, ...props } = useMockServer(
//         { rowLength: 100000, editable: true },
//         { useCursorPagination: false, minDelay: 200, maxDelay: 500 },
//     );

//     const dataSource = React.useMemo(
//         () => ({
//             getRows: async (params) => {
//                 const urlParams = new URLSearchParams({
//                     filterModel: JSON.stringify(params.filterModel),
//                     sortModel: JSON.stringify(params.sortModel),
//                     start: `${params.start}`,
//                     end: `${params.end}`,
//                 });
//                 const getRowsResponse = await fetchRows(
//                     `https://mui.com/x/api/data-grid?${urlParams.toString()}`,
//                 );
//                 //'http://localhost:5000/organizations'
//                 return {
//                     rows: getRowsResponse.rows,
//                     rowCount: getRowsResponse.rowCount,
//                 };
//             },
//             updateRow: async (params) => {
//                 const syncedRow = await editRow(params.rowId, params.updatedRow);
//                 return syncedRow;
//             },
//         }),
//         [fetchRows, editRow],
//     );

//     return (
//         <div style={{ width: '100%', height: 450 }} className='pt-32'>
//             <DataGridPro
//                 {...props}
//                 dataSource={dataSource}
//                 lazyLoading
//                 paginationModel={{ page: 0, pageSize: 10 }}
//             />
//         </div>
//     );
// }

// export default Test;

import React from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaMicrophone, FaMicrophoneSlash } from "react-icons/fa";


const Test = () => {
    const {
        transcript,
        listening,
        resetTranscript,
        browserSupportsSpeechRecognition
    } = useSpeechRecognition();

    if (!browserSupportsSpeechRecognition) {
        return <span>Browser doesn't support speech recognition.</span>;
    }

    return (
        <div className='mt-32'>
            <div className='flex justify-center items-center'>
                <button onClick={SpeechRecognition.startListening}>
                    {listening ? (

                        <span class="relative flex size-3">
                            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-900 dark:bg-white opacity-75"></span>
                            <span class="relative inline-flex size-3 rounded-full bg-gray-900 dark:bg-white"></span>
                        </span>
                    ) : (
                        // <FaMicrophoneSlash />
                        <FaMicrophone />
                    )}
                </button>

                <button onClick={resetTranscript}>Reset</button>
            </div>
            <p>{transcript}</p>
        </div>
    );
};
export default Test;