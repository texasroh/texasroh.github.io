import HomeSection from "../../components/HomeSection";
import { FaGithub } from "react-icons/fa";

const ToyProjects = () => {
  return (
    <HomeSection title="Toy Projects">
      <ul className="ml-4 list-disc space-y-4 md:ml-0">
        <li>
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-medium">
              <a href="https://dmvhanin.com" target="_blank" className="inline">
                dmvhanin.com
              </a>
            </h4>
            <FaGithub />
            <span>
              <a href="https://github.com/texasroh/dmvhanin" target="_blank">
                V1
              </a>
            </span>
            ,
            <span>
              <a href="https://github.com/texasroh/dmvhanin-v2" target="_blank">
                V2
              </a>
            </span>
          </div>
          <p>버지니아, 디씨, 메릴랜드 한인 커뮤니티 사이트</p>
          <p>Flask(V1), Django(V2), EC2, RDS, Nginx, Gunicorn, PostgreSQL</p>
        </li>
        <li>
          <div className="flex items-center space-x-2">
            <h4 className="text-lg font-medium">
              <a
                href="https://play.google.com/store/apps/details?id=com.pricescanner"
                target="_blank"
                className="inline"
              >
                Price Scanner
              </a>
            </h4>
            <a href="https://github.com/texasroh/price-scanner" target="_blank">
              <FaGithub />
            </a>
          </div>
          <p>오프라인에서 쇼핑할때 바코드 스캔으로 온라인 쇼핑몰 가격 비교</p>
          <p>React Native, cheerio</p>
        </li>
      </ul>
    </HomeSection>
  );
};

export default ToyProjects;
