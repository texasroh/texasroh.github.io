import HomeSection from "../../components/HomeSection";
import { FaGithub, FaGooglePlay } from "react-icons/fa";
import { useTranslation } from "react-i18next";

const ToyProjects = () => {
  const { t } = useTranslation();
  return (
    <HomeSection title="Toy Projects">
      <ul className="ml-4 list-disc space-y-4 md:ml-0">
        <li>
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-medium">
              <a
                href="https://dmvhanin.com"
                target="_blank"
                className="inline"
                rel="noreferrer"
              >
                1 to 50
              </a>
            </h4>
            <a
              href="https://play.google.com/store/apps/details?id=com.muracano.onetofifty"
              target="_blank"
              rel="noreferrer"
            >
              <FaGooglePlay />
            </a>
          </div>
          <p>{t("onetofifty_1st")}</p>
          <p>Expo, React native, Firebase, Supabase</p>
        </li>
        <li>
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-medium">
              <a
                href="https://dmvhanin.com"
                target="_blank"
                className="inline"
                rel="noreferrer"
              >
                dmvhanin.com
              </a>
            </h4>
            <FaGithub />
            <span>
              <a
                href="https://github.com/texasroh/dmvhanin"
                target="_blank"
                rel="noreferrer"
              >
                v1
              </a>
            </span>
            ,
            <span>
              <a
                href="https://github.com/texasroh/dmvhanin-v2"
                target="_blank"
                rel="noreferrer"
              >
                v2
              </a>
            </span>
          </div>
          <p>{t("dmvhanin_1st")}</p>
          <p>Flask(v1), Django(v2), EC2, RDS, Nginx, Gunicorn, PostgreSQL</p>
        </li>
        <li>
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-medium">
              <a
                href="https://play.google.com/store/apps/details?id=com.pricescanner"
                target="_blank"
                className="inline"
                rel="noreferrer"
              >
                Price Scanner
              </a>
            </h4>
            <a
              href="https://github.com/texasroh/price-scanner"
              target="_blank"
              rel="noreferrer"
            >
              <FaGithub />
            </a>
          </div>
          <p>{t("pricescanner_1st")}</p>
          <p>React Native, cheerio(crawling)</p>
        </li>
      </ul>
    </HomeSection>
  );
};

export default ToyProjects;
