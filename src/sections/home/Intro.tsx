import { useTranslation } from "react-i18next";
import HomeSection from "../../components/HomeSection";

const Intro = () => {
  const { t } = useTranslation();
  return (
    <HomeSection title="Intro">
      <div className="space-y-6">
        <p>{t("intro_1st")}</p>
        <p>{t("intro_2nd")}</p>
        <p>{t("intro_3rd")}</p>
      </div>
    </HomeSection>
  );
};

export default Intro;
