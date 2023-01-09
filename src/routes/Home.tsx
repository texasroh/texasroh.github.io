import { useTranslation } from "react-i18next";
import Educations from "../sections/home/Educations";
import myPhoto from "../images/my_photo.jpg";
import Intro from "../sections/home/Intro";
import Experiences from "../sections/home/Experiences";
import OtherExperiences from "../sections/home/OtherExperiences";
import ToyProjects from "../sections/home/ToyProjects";
import Skills from "../sections/home/Skills";

const Home = () => {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div className="flex flex-col justify-center gap-8 md:flex-row">
        <div className="basis-1/3">
          <img src={myPhoto} className="md:w-" />
        </div>
        <div className="basis-1/3">
          <div>덕업일치중..</div>
          <div>노준혁</div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
      <Intro />
      <Experiences />
      <OtherExperiences />
      <ToyProjects />
      <Skills />
      <Educations />
    </div>
  );
};

export default Home;
