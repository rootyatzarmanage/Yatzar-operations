import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function AppPermission() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta
        title="App Permission | Yatzar Operation"
        description="Yatzar Operation app permissions"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.appPermission")} />
    </>
  );
}