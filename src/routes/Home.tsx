import Educations from "../sections/home/Educations";
import myPhoto from "../images/my_photo.jpg";
import myPhoto2 from "../images/my_photo2.jpg";
import Intro from "../sections/home/Intro";
import Experiences from "../sections/home/Experiences";
import OtherExperiences from "../sections/home/OtherExperiences";
import ToyProjects from "../sections/home/ToyProjects";
import Skills from "../sections/home/Skills";
import { FaBlogger, FaGithub, FaLinkedin } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { useRecoilValue } from "recoil";
import { topIconState } from "../atoms";

const Home = () => {
  const toTop = useRecoilValue(topIconState);
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex flex-col items-center justify-center gap-8 md:flex-row">
        <div className="basis-1/3">
          <div className="grid grid-cols-2 overflow-hidden rounded-lg">
            <img src={myPhoto} className="md:w-" />
            <img src={myPhoto2} className="md:w-" />
            <img src={myPhoto2} className="md:w-" />
            <img src={myPhoto} className="md:w-" />
          </div>
        </div>
        <AnimatePresence>
          <div className="basis-1/3 space-y-6">
            <div className="text-center text-xl font-bold text-gray-500">
              | {t("one_line_desc")} |
            </div>
            {toTop ? (
              <div className="h-[90px]" />
            ) : (
              <>
                <motion.div
                  className="text-center text-3xl font-bold"
                  layoutId="name"
                >
                  {t("june_name")}
                </motion.div>
                <motion.div
                  className="flex items-center justify-center space-x-4 text-sm"
                  layoutId="links"
                >
                  <a
                    href="https://github.com/texasroh"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaGithub size={30} className="text-black" />
                  </a>
                  <a
                    href="https://texasroh.blogspot.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaBlogger size={30} className="text-orange-400" />
                  </a>
                  <a
                    href="https://www.linkedin.com/in/junhyeok-roh/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaLinkedin size={30} className="text-blue-600" />
                  </a>
                </motion.div>
              </>
            )}
          </div>
        </AnimatePresence>
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
