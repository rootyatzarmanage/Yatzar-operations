import { Link } from "react-router";

interface BreadcrumbProps {
  pageTitle: string;
  parent?: {
    label: string;
    to?: string;
  };
}

const BreadcrumbSeparator = ({
  type,
}: {
  type: "chevron" | "slash";
}) => (
  <li
    aria-hidden="true"
    className="text-gray-400 dark:text-gray-500"
  >
    {type === "slash" ? (
      "/"
    ) : (
      <svg
        className="stroke-current rtl:rotate-180"
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M6 12L10 8L6 4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </li>
);

const PageBreadcrumb: React.FC<BreadcrumbProps> = ({ pageTitle, parent }) => {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h2
        className="text-xl font-semibold text-gray-800 dark:text-white/90"
        x-text="pageName"
      >
        {pageTitle}
      </h2>
      <nav>
        <ol className="flex items-center gap-2">
          <li>
            <Link
              className="text-sm text-gray-500 dark:text-gray-400"
              to="/"
            >
              Home
            </Link>
          </li>
          <BreadcrumbSeparator type="chevron" />
          {parent && (
            <>
              <li className="text-sm text-gray-800 dark:text-white/90">
                {parent.to ? (
                  <Link to={parent.to} className="text-inherit">
                    {parent.label}
                  </Link>
                ) : (
                  parent.label
                )}
              </li>
              <BreadcrumbSeparator type="slash" />
            </>
          )}
          <li className="text-sm text-gray-800 dark:text-white/90">
            {pageTitle}
          </li>
        </ol>
      </nav>
    </div>
  );
};

export default PageBreadcrumb;
