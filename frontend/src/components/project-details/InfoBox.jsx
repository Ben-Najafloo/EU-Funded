import React from 'react'

const InfoBox = ({ lable, value, icon: Icon }) => {
    return (
        <div className='flex py-1 my-3'>
            <label className="flex text-sm text-gray-900 dark:text-gray-300 w-28">
                {Icon && <Icon className='mr-2 mt-1' />}
                {lable}:
            </label>
            <div className="block text-sm font-medium text-gray-900 dark:text-gray-300">
                {value}
            </div>
        </div>
    );
};

export default InfoBox
