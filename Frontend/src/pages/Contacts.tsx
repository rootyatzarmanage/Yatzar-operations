import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { useTranslation } from "react-i18next";

export default function Contacts() {
  const { t } = useTranslation();

  return (
    <>
      <PageMeta
        title="Contacts | Yatzar Operation"
        description="Yatzar Operation contacts"
      />
      <PageBreadcrumb pageTitle={t("sidebar.items.contacts")} />
    </>
  );
}