import React from "react";
import { Card } from "../ui/card";

interface ComingSoonProps {
    title?: string;
    msg1?: string;
    msg2?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title, msg1, msg2 }) => (
    <Card className="border-slate-200">
        <div className="w-full mx-auto mt-6 px-6 py-12 flex flex-col items-center justify-center">
            <svg
                className="w-16 h-16 text-blue-300 mb-4 animate-bounce"
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
            <h2 className="text-2xl font-bold text-gray-700 mb-2">Coming Soon</h2>
            <p className="text-gray-500 text-center max-w-md mb-4">
                {msg1 || `This feature ${title ? `'${title}'` : ''} is under development.`}
                <br />
                {msg2 || "Soon, you'll be able to access and use this functionality."}
            </p>
            <span className="inline-block bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">Stay tuned!</span>
        </div>
    </Card>
);

export default ComingSoon;
