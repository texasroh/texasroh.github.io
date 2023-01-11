import React from "react";

interface IHomeSectionProps {
  title: string;
  children: React.ReactNode;
}

const HomeSection = ({ title, children }: IHomeSectionProps) => {
  return (
    <section className="my-12 flex flex-col md:flex-row md:space-x-12">
      <div className="md:basis-3/12">
        <h2 className="mb-4 text-2xl font-bold text-emerald-600 md:text-right">
          {title}
        </h2>
      </div>
      <div className="hidden border-r-2 border-stone-500 md:block"></div>
      <div className="md:basis-8/12">{children}</div>
    </section>
  );
};

export default HomeSection;
