import HomeSection from "../../components/HomeSection";

const OtherExperiences = () => {
  return (
    <HomeSection title="Other Experience">
      <ul className="ml-4 list-disc space-y-4 md:ml-0">
        <li>
          <div>
            <a href="https://texasroh.github.io/muraVPN" target="_blank">
              VPN Service
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
          <div></div>
        </li>
      </ul>
    </HomeSection>
  );
};

export default OtherExperiences;
