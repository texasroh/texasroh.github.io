import { createHashRouter, RouterProvider } from "react-router-dom";
import Home from "./routes/Home";

const hashRouter = createHashRouter([
    {
        path: `${process.env.PUBLIC_URL}/`,
        element: <Home />,
    },
]);

function App() {
    return <RouterProvider router={hashRouter} />;
}

export default App;
