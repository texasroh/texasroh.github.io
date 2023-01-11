import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const Header = () => {
  const { t, i18n } = useTranslation();
  const isEng = i18n.language === "en";
  const onLangClick = () => {
    i18n.changeLanguage(isEng ? "ko" : "en");
  };
  const onLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <header className="fixed top-0 z-10 flex h-16 w-full items-center justify-center border-b bg-white">
      <div className="container mx-3 flex items-center justify-between">
        <div className="select-none text-xl font-bold">
          <div onClick={onLogoClick} className="cursor-pointer">
            June
          </div>
        </div>
        <div className="hidden md:block">
          <ul className="flex space-x-4">
            {/* <li>{t("portfolio")}</li> */}
            <li onClick={onLangClick} className="cursor-pointer select-none">
              {isEng ? "한국어" : "Eng"}
            </li>
          </ul>
        </div>
        <div className="md:hidden"></div>
      </div>
    </header>
  );
};

export default Header;
