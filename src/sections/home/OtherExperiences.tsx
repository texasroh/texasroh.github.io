import HomeSection from "../../components/HomeSection";
import { FaGithub } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const OtherExperiences = () => {
  const { t } = useTranslation();
  return (
    <HomeSection title="Other Experience">
      <ul className="ml-4 list-disc space-y-4 md:ml-0">
        <li>
          <div className="flex items-center space-x-2">
            <a
              href="https://texasroh.github.io/muraVPN"
              target="_blank"
              rel="noreferrer"
            >
              {t("vpn_service")}
            </a>
            <a
              href="https://github.com/texasroh/muraVPN"
              target="_blank"
              rel="noreferrer"
            >
              <FaGithub />
            </a>
          </div>
          <p>{t("vpn_1st")}</p>
          <p>Ubuntu 22.04, OpenVPN Server</p>
        </li>
        <li>
          <div>
            Data Competition @
            <a href="https://www.alcon.com/" target="_blank" rel="noreferrer">
              Alcon
            </a>{" "}
            -{" "}
            <a
              href="https://www.linkedin.com/feed/update/urn:li:activity:6641726798428200960/"
              target="_blank"
              rel="noreferrer"
            >
              1st prize
            </a>
          </div>
          <p>{t("data_comp_1st")}</p>
          <p>EDA, Time Series, Regressions, Classification</p>
        </li>
      </ul>
    </HomeSection>
  );
};

export default OtherExperiences;
