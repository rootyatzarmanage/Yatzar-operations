import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function Workspace() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta
        title="Workspace | Yatzar Operations"
        description="Yatzar Operations workspace"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.workspace")} />
    </>
  );
}