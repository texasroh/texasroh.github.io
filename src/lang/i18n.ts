import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import langEn from "../lang/lang.en.json";
import langKo from "../lang/lang.ko.json";

const resources = {
  en: {
    translation: langEn,
  },
  ko: {
    translation: langKo,
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
});

export default i18n;
