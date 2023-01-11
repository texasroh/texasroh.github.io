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
                <li></li>
              </ul>
            </li>
            <li className="flex flex-col md:flex-row">
              <div className="basis-1/4 font-bold">Data Lead</div>
              <ul className="ml-4 list-disc">
                <li></li>
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
              <li></li>
            </ul>
          </div>
        </li>
      </ul>
    </HomeSection>
  );
};

export default Experiences;
