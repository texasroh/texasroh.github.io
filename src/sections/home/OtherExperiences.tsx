import HomeSection from "../../components/HomeSection";
import { FaGithub } from "react-icons/fa";

const OtherExperiences = () => {
  return (
    <HomeSection title="Other Experience">
      <ul className="ml-4 list-disc space-y-4 md:ml-0">
        <li>
          <div className="flex items-center space-x-2">
            <a href="https://texasroh.github.io/muraVPN" target="_blank">
              VPN Service
            </a>
            <a href="https://github.com/texasroh/muraVPN" target="_blank">
              <FaGithub />
            </a>
          </div>
          <p>해외에서 한국의 서비스를 이용하기 위한 VPN 서비스</p>
          <p>Ubuntu 22.04, OpenVPN Server</p>
        </li>
        <li>
          <div>
            Data Competition @
            <a href="https://www.alcon.com/" target="_blank">
              Alcon
            </a>{" "}
            -{" "}
            <a
              href="https://www.linkedin.com/feed/update/urn:li:activity:6641726798428200960/"
              target="_blank"
            >
              1st prize
            </a>
          </div>
          <p>기존 제품군들과 신제품의 수요예측 및 방향성 검토</p>
          <p>EDA, Time Series, Regressions, Classification</p>
        </li>
      </ul>
    </HomeSection>
  );
};

export default OtherExperiences;
