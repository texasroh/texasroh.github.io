import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { FaBlogger, FaGithub, FaLinkedin } from "react-icons/fa";
import { useRecoilValue } from "recoil";
import { topIconState } from "../atoms";

const Header = () => {
  const toTop = useRecoilValue(topIconState);
  const { i18n } = useTranslation();
  const isEng = i18n.language === "en";
  const onLangClick = () => {
    i18n.changeLanguage(isEng ? "ko" : "en");
  };
  const onLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <header className="fixed top-0 z-10 flex h-16 w-full items-center justify-center border-b bg-white">
      <AnimatePresence>
        <div className="container mx-3 flex items-center justify-between">
          <div className="select-none text-xl font-bold">
            {toTop && (
              <motion.div
                onClick={onLogoClick}
                className="cursor-pointer"
                layoutId="name"
              >
                June
              </motion.div>
            )}
          </div>
          {toTop && (
            <motion.div
              className="flex items-center justify-center space-x-4 text-sm"
              layoutId="links"
            >
              <a
                href="https://github.com/texasroh"
                target="_blank"
                rel="noreferrer"
              >
                <FaGithub size={30} className="text-black" />
              </a>
              <a
                href="https://texasroh.blogspot.com/"
                target="_blank"
                rel="noreferrer"
              >
                <FaBlogger size={30} className="text-orange-400" />
              </a>
              <a
                href="https://www.linkedin.com/in/junhyeok-roh/"
                target="_blank"
                rel="noreferrer"
              >
                <FaLinkedin size={30} className="text-blue-600" />
              </a>
            </motion.div>
          )}
          <ul className="flex space-x-4">
            {/* <li>{t("portfolio")}</li> */}
            <li onClick={onLangClick} className="cursor-pointer select-none">
              {isEng ? "한국어" : "Eng"}
            </li>
          </ul>
        </div>
      </AnimatePresence>
    </header>
  );
};

export default Header;
