import { listOptions } from "@/api/options";
import { useWorkspace } from "@/context/WorkspaceContext";
import {
  addLeadToCustomers,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
  type LeadRecord,
} from "@/api/leads";
import RecordPage, {
  validateCoordinate,
  type Column,
  type FormSection,
} from "@/components/records/RecordPage";
import { useEffect, useMemo, useState } from "react";

const fallbackSources = ["Website", "Referral", "Social media", "Cold call", "Event"];
const text = (value: string | boolean | undefined) => String(value ?? "");
const leadName = (lead: LeadRecord) =>
  `${text(lead.firstName)} ${text(lead.lastName)}`.trim() || text(lead.company);

const columns: Column<LeadRecord>[] = [
  { header: "Lead Name", render: (r) => <span className="font-medium text-gray-800 dark:text-white/90">{leadName(r)}</span> },
  { header: "Company", render: (r) => text(r.company) || "—" },
  { header: "Email", render: (r) => text(r.email) || "—" },
  { header: "Phone", render: (r) => text(r.phone) || "—" },
  { header: "Lead Source", render: (r) => text(r.leadSource) || "—" },
  { header: "Lead Status", render: (r) => text(r.leadStatus) || "—" },
  { header: "Lead Owner", render: (r) => text(r.leadOwner) || "—" },
];

export default function Leads() {
  const { currentWorkspace } = useWorkspace();
  const [sources, setSources] = useState<string[]>(fallbackSources);

  const store = useMemo(
    () => ({
      list: async () => {
        if (!currentWorkspace) return [];

        const leads = await listLeads();

        return leads.filter(
          (lead) => lead.workspaceId === currentWorkspace.id,
        );
      },
      create: createLead,
      update: updateLead,
      remove: deleteLead,
    }),
    [currentWorkspace],
  );

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
        title: "Lead information",
        fields: [
          { key: "leadOwner", label: "Lead owner", type: "select", options: ["superadmin"], placeholder: "Select owner", defaultValue: "superadmin" },
          { key: "company", label: "Company", required: true, placeholder: "Enter company" },
          { key: "firstName", label: "First name", required: true, placeholder: "Enter first name" },
          { key: "lastName", label: "Last name", placeholder: "Enter last name" },
          { key: "title", label: "Title", placeholder: "Enter title" },
          { key: "email", label: "Email", type: "email", placeholder: "name@example.com" },
          { key: "phone", label: "Phone", type: "tel", placeholder: "Enter phone number" },
          { key: "fax", label: "Fax", placeholder: "Enter fax number"},
          { key: "mobile", label: "Mobile", type: "tel", placeholder: "Enter mobile number" },
          { key: "website", label: "Website", placeholder: "https://" },
          { key: "leadSource", label: "Lead source", type: "select", options: sources },
          { key: "leadStatus", label: "Lead status", type: "select", options: ["Not contacted", "Attempted", "Contacted", "Qualified", "Lost"], defaultValue: "Not contacted" },
          { key: "industry", label: "Industry", type: "select", options: ["Technology", "Finance", "Manufacturing", "Retail", "Healthcare", "Education"] },
          { key: "employees", label: "No. of employees", type: "number", placeholder: "0" },
          { key: "annualRevenue", label: "Annual revenue", type: "number", placeholder: "Rs." },
          { key: "rating", label: "Rating", type: "select", options: ["Hot", "Warm", "Cold"] },
          { key: "skypeId", label: "Skype ID", placeholder: "live:your-skype-id" },
          { key: "secondaryEmail", label: "Secondary email", type: "email", placeholder: "name@example.com" },
          { key: "twitter", label: "Twitter", placeholder: "@" },
          { key: "emailOptOut", label: "Email opt out", type: "checkbox" },
        ],
      },
      {
        title: "Address information",
        fields: [
          { key: "country", label: "Country / Region" },
          { key: "flat", label: "Flat / House no. / Building" },
          { key: "street", label: "Street address" },
          { key: "city", label: "City" },
          { key: "state", label: "State / Province" },
          { key: "zip", label: "Zip / Postal code" },
          { key: "latitude", label: "Latitude", validate: validateCoordinate(-90, 90, "Latitude") },
          { key: "longitude", label: "Longitude", validate: validateCoordinate(-180, 180, "Longitude") },
        ],
      },
      {
        title: "Description information",
        fields: [{ key: "description", label: "Description", type: "textarea", placeholder: "Add notes about this lead" }],
      },
    ],
    [sources],
  );

  return (
    <RecordPage<LeadRecord>
      pageTitle="Leads"
      heading="Lead information"
      subtitle="Track and manage leads in one place."
      singular="Lead"
      plural="leads"
      addLabel="Add Lead"
      searchPlaceholder="Search leads"
      sections={sections}
      columns={columns}
      searchText={(r) => [leadName(r), text(r.company), text(r.email), text(r.phone), text(r.leadSource), text(r.leadOwner)]}
      recordName={leadName}
      store={store}
      showExport={false}
      viewBadge={() => currentWorkspace?.name ?? ""}
      moves={[
        {
          label: "Move to customer",
          tone: "emerald",
          confirm: (n) => `Move ${n} to Customers? It will be removed from Leads.`,
          done: (n) => `${n} moved to Customers.`,
          run: (r) => addLeadToCustomers(r.id),
        },
      ]}
    />
  );
}
