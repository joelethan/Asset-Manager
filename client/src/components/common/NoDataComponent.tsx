import React from "react";

const NoDataComponent: React.FC<{ message?: string }> = ({ message }) => (
    <div className="flex flex-col items-center justify-center py-8">
        <svg
            className="w-12 h-12 text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 17v.01M12 7v6m0 8a9 9 0 100-18 9 9 0 000 18z"
            />
        </svg>
        <div className="text-base font-medium text-gray-700 mb-1">
            No data found
        </div>
        <div className="text-sm text-gray-500 text-center max-w-xs">
            {message || "There is no data available for your query. Please check your filters or try again."}
        </div>
    </div>
);

export default NoDataComponent;
