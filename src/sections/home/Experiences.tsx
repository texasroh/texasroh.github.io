import { useTranslation } from "react-i18next";
import HomeSection from "../../components/HomeSection";

const Experiences = () => {
  const { t } = useTranslation();
  return (
    <HomeSection title="Experiences">
      <ul className="space-y-8">
        <li>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium">
              <a href="https://streetsmarket.com" target="_blank">
                Streets Market
              </a>
            </h3>
            <span className="text-sm font-medium text-gray-500">
              2020.06 ~ {t("current")}
            </span>
          </div>
          <p className="py-4">{t("streets_market_desc")}</p>
          <ul className="space-y-2">
            <li className="flex flex-col md:flex-row">
              <div className="shrink-0 basis-1/4 font-bold">Tech Lead</div>
              <ul className="ml-4 list-disc">
                <li>{t("tech_lead_1st")}</li>
                <li>{t("tech_lead_2nd")}</li>
                <li>{t("tech_lead_3rd")}</li>
                <li>{t("tech_lead_4th")}</li>
              </ul>
            </li>
            <li className="flex flex-col md:flex-row">
              <div className="shrink-0 basis-1/4 font-bold">Data Lead</div>
              <ul className="ml-4 list-disc">
                <li>{t("data_lead_1st")}</li>
                <li>{t("data_lead_2nd")}</li>
                <li>{t("data_lead_3rd")}</li>
                <li>{t("data_lead_4th")}</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium">
              <a href="https://www.samsung.com" target="_blank">
                {t("samsung_electronics")}
              </a>
            </h3>
            <span className="text-sm font-medium text-gray-500">
              2014.02 ~ 2015.03
            </span>
          </div>
          <div className="flex flex-col md:flex-row">
            <div className="shrink-0 basis-1/4 flex-wrap font-bold">
              {t("android_developer")}
            </div>
            <ul className="ml-4 list-disc">
              <li>{t("and_dev_1st")}</li>
              <li>{t("and_dev_2nd")}</li>
            </ul>
          </div>
        </li>
      </ul>
    </HomeSection>
  );
};

export default Experiences;
