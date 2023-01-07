import { useTranslation } from "react-i18next";
import Intro from "../components/Intro";
import myPhoto from "../images/my_photo.jpg";

const Home = () => {
  const { t, i18n } = useTranslation();
  return (
    <div>
      <div className="flex justify-center gap-8">
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
    </div>
  );
};

export default Home;
