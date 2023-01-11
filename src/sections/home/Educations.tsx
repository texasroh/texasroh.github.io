import HomeSection from "../../components/HomeSection";

const Educations = () => {
  return (
    <HomeSection title="Educations">
      <ul className="ml-4 list-disc space-y-4 md:ml-0">
        <li>
          <div className="flex items-center justify-between font-medium">
            <div>University of Texas</div>
            <span className="text-sm text-gray-500">2016.01 ~ 2020.05</span>
          </div>
          <ul className="ml-6">
            <li>Master of Business Analytics</li>
            <li>Master of Business Administration</li>
          </ul>
        </li>
        <li>
          <div className="flex justify-between font-medium">
            <div>경북대학교</div>
            <span className="text-sm text-gray-500">2007.03 ~ 2014.02</span>
          </div>
          <ul className="ml-6">
            <li>전자공학부</li>
          </ul>
        </li>
      </ul>
    </HomeSection>
  );
};

export default Educations;
