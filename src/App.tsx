import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./routes/Home";

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
]);

function App() {
    return <RouterProvider router={hashRouter} />;
}

export default App;
