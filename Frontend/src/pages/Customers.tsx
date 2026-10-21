import { listOptions } from "@/api/options";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type CustomerRecord,
} from "@/api/customers";
import RecordPage, {
  type Column,
  type FieldDef,
  type FormSection,
} from "@/components/records/RecordPage";
import { useEffect, useMemo, useState } from "react";
import type { EmbedProps } from "@/components/records/embed";

const fallbackSources = ["Website", "Referral", "Social media", "Cold call", "Event"];
const text = (value: string | boolean | undefined) => String(value ?? "");
const customerName = (c: CustomerRecord) => `${text(c.firstName)} ${text(c.lastName)}`.trim();

const columns: Column<CustomerRecord>[] = [
  { header: "Customer ID", render: (r) => text(r.customerId) || "—" },
  { header: "Customer Name", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{customerName(r)}</span> },
  { header: "Email", render: (r) => text(r.email) || "—" },
  { header: "Phone", render: (r) => text(r.phone) || "—" },
  { header: "Department", render: (r) => text(r.department) || "—" },
  { header: "Lead Source", render: (r) => text(r.leadSource) || "—" },
];

const addressFields = (prefix: "" | "other"): FieldDef[] => {
  const k = (name: string) => (prefix ? `${prefix}${name}` : name[0].toLowerCase() + name.slice(1));
  return [
    { key: k("AddressLine1"), label: "Flat / House no. / Building", required: true },
    { key: k("AddressLine2"), label: "Street address" },
    { key: k("City"), label: "City", required: true },
    { key: k("State"), label: "State", required: true },
    { key: k("Country"), label: "Country", required: true },
    { key: k("Pincode"), label: "Pincode", required: true },
  ];
};

export default function Customers({ embed }: EmbedProps = {}) {
  const { currentWorkspace } = useWorkspace();
  const [sources, setSources] = useState<string[]>(fallbackSources);

  const store = useMemo(
    () => ({
      list: async () => {
        if (!currentWorkspace) return [];

        const customers = await listCustomers();

        return customers.filter(
          (customer) => customer.workspaceId === currentWorkspace.id,
        );
      },
      create: createCustomer,
      update: updateCustomer,
      remove: deleteCustomer,
    }),
    [currentWorkspace],
  )

  useEffect(() => {
    let active = true;
    void listOptions("lead_source")
      .then((options) => {
        const configured = [...new Set(options.map((o) => o.value.trim()))].filter(Boolean);
        if (active && configured.length) setSources(configured);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const sections = useMemo<FormSection[]>(
    () => [
      {
        title: "Customer information",
        fields: [
          { key: "firstName", label: "First name", required: true, placeholder: "Enter first name" },
          { key: "lastName", label: "Last name", placeholder: "Enter last name" },
          { key: "email", label: "Email", type: "email", placeholder: "name@example.com" },
          { key: "phone", label: "Phone", type: "tel", required: true },
          { key: "otherPhone", label: "Other phone", type: "tel" },
          { key: "department", label: "Department" },
          { key: "leadSource", label: "Lead source", type: "select", required: true, options: sources, placeholder: "Select lead source" },
        ],
      },
      { title: "Address", subtitle: "Mailing address", fields: addressFields("") },
      { title: "Other address", fields: addressFields("other") },
    ],
    [sources],
  );

  return (
    <RecordPage<CustomerRecord>
      permissionMenu="Contacts"
      embed={embed}
      pageTitle="Customers"
      parent={{ label: "Engagement" }}
      heading="Customer information"
      subtitle="Manage customer records and their information in one place."
      singular="Customer"
      plural="customers"
      addLabel="Add Customer"
      searchPlaceholder="Search customers"
      sections={sections}
      columns={columns}
      searchText={(r) => [text(r.customerId), customerName(r), text(r.email), text(r.phone), text(r.department), text(r.leadSource)]}
      recordName={customerName}
      store={store}
      showExport={false}
      viewBadge={() => currentWorkspace?.name ?? ""}
    />
  );
}
