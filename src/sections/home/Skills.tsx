import HomeSection from "../../components/HomeSection";

const Skills = () => {
  return (
    <HomeSection title="Skills">
      <div className="space-y-4">
        <div className="rounded border border-stone-300">
          <h3 className="border-b border-stone-300 py-2 px-4 font-medium">
            Developer
          </h3>
          <ul className="space-y-2 p-4">
            <li className="flex space-x-2">
              <h4 className="shrink-0 pt-1 text-sm font-medium">Front-End: </h4>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  JavaScript
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  TypeScript
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  React.js
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  React Native
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Next.js
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  HTML / CSS
                </span>
              </div>
            </li>
            <li className="flex space-x-2">
              <h4 className="shrink-0 pt-1 text-sm font-medium">Back-End: </h4>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-amber-700 py-1 px-2 text-sm text-white">
                  Django
                </span>
                <span className="rounded bg-amber-700 py-1 px-2 text-sm text-white">
                  Django Rest Framework
                </span>
                <span className="rounded bg-amber-700 py-1 px-2 text-sm text-white">
                  Nest.js
                </span>
                <span className="rounded bg-amber-700 py-1 px-2 text-sm text-white">
                  AWS
                </span>
                <span className="rounded bg-amber-700 py-1 px-2 text-sm text-white">
                  Nginx
                </span>
                <span className="rounded bg-amber-700 py-1 px-2 text-sm text-white">
                  Linux
                </span>
              </div>
            </li>
            <li className="flex space-x-2">
              <h4 className="shrink-0 pt-1 text-sm font-medium">Database: </h4>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-blue-800 py-1 px-2 text-sm text-white">
                  PostgreSQL
                </span>
                <span className="rounded bg-blue-800 py-1 px-2 text-sm text-white">
                  MongoDB
                </span>
              </div>
            </li>
            <li className="flex space-x-2">
              <h4 className="shrink-0 pt-1 text-sm font-medium">Etc: </h4>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-lime-700 py-1 px-2 text-sm text-white">
                  REST API
                </span>
                <span className="rounded bg-lime-700 py-1 px-2 text-sm text-white">
                  GraphQL
                </span>
                <span className="rounded bg-lime-700 py-1 px-2 text-sm text-white">
                  OAuth
                </span>
              </div>
            </li>
          </ul>
        </div>
        <div className="rounded border border-stone-300">
          <h3 className="border-b border-stone-300 py-2 px-4 font-medium">
            Data Science
          </h3>
          <ul className="space-y-2 p-4">
            <li className="flex space-x-2">
              <h4 className="shrink-0 pt-1 text-sm font-medium">Theory: </h4>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Statistics
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Regression
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Classification
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Hypothesis Test
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Time Series
                </span>
                <span className="rounded bg-stone-500 py-1 px-2 text-sm text-white">
                  Deep Learning
                </span>
              </div>
            </li>
            <li className="flex space-x-2">
              <h4 className="shrink-0 pt-1 text-sm font-medium">Tools: </h4>
              <div className="flex flex-wrap gap-1">
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Python
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Pandas
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Numpy
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Matplotlib
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Seaborn
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Statsmodel
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Sklearn
                </span>
                <span className="rounded bg-gray-800 py-1 px-2 text-sm text-white">
                  Tensorflow
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </HomeSection>
  );
};

export default Skills;
