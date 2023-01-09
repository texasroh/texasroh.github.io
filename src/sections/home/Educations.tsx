import HomeSection from "../../components/HomeSection";

const Educations = () => {
  return (
    <HomeSection title="Educations">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between font-medium">
            <div>University of Texas</div>
            <div>2016.01 ~ 2020.05</div>
          </div>
          <ul className="ml-6">
            <li>Business Analytics</li>
            <li>Master of Business Administration</li>
          </ul>
        </div>
        <div>
          <div className="flex justify-between font-medium">
            <div>경북대학교</div>
            <div>2007.03 ~ 2014.02</div>
          </div>
          <ul className="ml-6">
            <li>전자공학부</li>
          </ul>
        </div>
      </div>
    </HomeSection>
  );
};

export default Educations;
