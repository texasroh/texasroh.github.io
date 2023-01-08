import { useTranslation } from "react-i18next";
import Educations from "../components/Educations";
import Experiences from "../components/Experiences";
import Intro from "../components/Intro";
import OtherExperiences from "../components/OtherExperiences";
import Skills from "../components/Skills";
import ToyProjects from "../components/ToyProjects";
import myPhoto from "../images/my_photo.jpg";

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
