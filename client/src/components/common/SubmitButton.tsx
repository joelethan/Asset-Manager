import React from "react";

interface SubmitButtonProps {
    loading?: boolean;
    disabled?: boolean;
    text?: React.ReactNode;
    className?: string;
    type?: "button" | "submit" | "reset";
}

const SubmitButton: React.FC<SubmitButtonProps> = ({
    loading = false,
    disabled = false,
    text = "Submit",
    className = "",
    type = "submit",
}) => (
    <button
        type={type}
        className={`px-6 py-2 rounded-md bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
        disabled={disabled || loading}
    >
        {loading ? (
            <>
                <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                Loading...
            </>
        ) : (
            text
        )}
    </button>
);

export default SubmitButton;
