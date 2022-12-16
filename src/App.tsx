import { createHashRouter, RouterProvider } from "react-router-dom";

const hashRouter = createHashRouter([]);

function App() {
    return <RouterProvider router={hashRouter} />;
}

export default App;
