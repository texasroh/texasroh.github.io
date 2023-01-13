import HomeSection from "../../components/HomeSection";

const Experiences = () => {
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
              2020.06 ~ Current
            </span>
          </div>
          <ul className="space-y-2">
            <li className="flex flex-col md:flex-row">
              <div className="basis-1/4 font-bold">Tech Lead</div>
              <ul className="ml-4 list-disc">
                <li>
                  온라인 밀키트 사이트 및 백오피스 개발. 새로운 비지니스 창출
                  (shopify, OAuth, Flask)
                </li>
                <li>
                  운영팀, 회계팀을 위한 ERP 시스템 개발 (Django, React, React
                  Native)
                </li>
                <li>
                  모바일로 실시간 레포트를 보여줄 수 있는 대시보드 개발 (Flask)
                </li>
              </ul>
            </li>
            <li className="flex flex-col md:flex-row">
              <div className="basis-1/4 font-bold">Data Lead</div>
              <ul className="ml-4 list-disc">
                <li>ETL 자동화 시스템</li>
                <li>수요 예측과 새로운 상품도입에 관한 분석</li>
              </ul>
            </li>
          </ul>
        </li>
        <li>
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-medium">
              <a href="https://www.samsung.com" target="_blank">
                Samsung Electronics
              </a>
            </h3>
            <span className="text-sm font-medium text-gray-500">
              2014.02 ~ 2015.03
            </span>
          </div>
          <div className="flex flex-col md:flex-row">
            <div className="basis-1/4 flex-wrap font-bold">
              Android Developer
            </div>
            <ul className="ml-4 list-disc">
              <li>Galaxy Setting team</li>
              <li>
                PLM을 통한 일 관리, 협업툴을 이용한 개발, 버전관리, 해외
                출장인력 관리
              </li>
            </ul>
          </div>
        </li>
      </ul>
    </HomeSection>
  );
};

export default Experiences;
