import Header from "./Header";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <>
      <Header />
      <div className="flex justify-center pt-20">
        <div className="container mx-3">
          <Outlet />
        </div>
      </div>
    </>
  );
};

export default Layout;
