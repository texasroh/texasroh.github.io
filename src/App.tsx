import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./routes/Home";
import NotFound from "./routes/NotFound";

const hashRouter = createHashRouter([
    {
        path: `${process.env.PUBLIC_URL}/`,
        element: <Layout />,
        children: [
            {
                index: true,
                element: <Home />,
            },
        ],
    },
    {
        path: "*",
        element: <NotFound />,
    },
]);

function App() {
    return <RouterProvider router={hashRouter} />;
}

export default App;
