import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function Ecommerce() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta
        title="Teams | Yatzar Operation"
        description="Yatzar Operation dashboard"
      />
      <PageBreadcrumb pageTitle={t("ecommerce.title")} />
    </>
  );
}