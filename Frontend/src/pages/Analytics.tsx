import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function Analytics() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta
        title="Analytics | Yatzar Operation"
        description="Yatzar Operation analytics dashboard"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.analytics") || "Analytics"} />
    </>
  );
}
