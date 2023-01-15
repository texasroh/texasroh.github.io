import Header from "./Header";
import { Outlet } from "react-router-dom";
import { AnimatePresence, useScroll } from "framer-motion";
import { useEffect } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { topIconState } from "../atoms";

const Layout = () => {
  const { scrollY } = useScroll();
  const setToTop = useSetRecoilState(topIconState);
  useEffect(() => {
    scrollY.on("change", () => {
      if (scrollY.get() >= 200) {
        setToTop(true);
      } else {
        setToTop(false);
      }
    });
  }, [scrollY, setToTop]);
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
