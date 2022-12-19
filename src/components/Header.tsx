import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

const Header = () => {
    const { t, i18n } = useTranslation();
    const isEng = i18n.language === "en";
    const onLangClick = () => {
        i18n.changeLanguage(isEng ? "ko" : "en");
    };
    return (
        <header className="fixed top-0 z-10 flex h-16 w-full items-center justify-center bg-red-200">
            <div className="container mx-3 flex items-center justify-between">
                <div className="select-none">June</div>
                <div className="hidden md:block">
                    <div
                        onClick={onLangClick}
                        className="cursor-pointer select-none"
                    >
                        {isEng ? "한국어" : "Eng"}
                    </div>
                </div>
                <div className="md:hidden"></div>
            </div>
        </header>
    );
};

export default Header;
