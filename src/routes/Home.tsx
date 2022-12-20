import { useTranslation } from "react-i18next";

const Home = () => {
    const { t, i18n } = useTranslation();
    return (
        <div className="bg-blue-200">
            <div className="flex justify-center gap-8">
                <div>Image</div>
                <div>
                    <div>{t("june_name")}</div>
                </div>
            </div>
        </div>
    );
};

export default Home;
