import { Link } from "react-router-dom";

const NotFound = () => {
    return (
        <div className="flex h-screen flex-col items-center justify-center gap-8">
            <div className="text-6xl font-bold">404</div>
            <div className="text-4xl font-medium">Page not found</div>
            <Link to="" className="flex font-bold">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="h-6 w-6"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                    />
                </svg>
                <span className="ml-4">Go to Home</span>
            </Link>
        </div>
    );
};

export default NotFound;
