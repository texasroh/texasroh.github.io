import Header from "../components/Header";
import { useTranslation } from "react-i18next";

const Home = () => {
    const { t, i18n } = useTranslation();
    return (
        <>
            <Header />
            <h1>{t("test")}</h1>
        </>
    );
};

export default Home;
