import React from "react";

interface IHomeSectionProps {
  title: string;
  children: React.ReactNode;
}

const HomeSection = ({ title, children }: IHomeSectionProps) => {
  return (
    <section className="my-4 flex flex-col space-x-12 md:flex-row">
      <div className="md:basis-4/12">
        <h2 className="text-right text-2xl font-bold text-emerald-600">
          {title}
        </h2>
      </div>
      <div className="border-r-2 border-stone-500"></div>
      <div className="md:basis-8/12">{children}</div>
    </section>
  );
};

export default HomeSection;
