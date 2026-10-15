import { useState } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type CampaignData = {
  id: number;
  name: string;
  type: string;
  status: string;
  subject: string;
  owner: string;
  budgetedCost: string;
  actualCost: string;
  senderName: string;
  senderAddress: string;
  replyToAddress: string;
  description: string;
};

type CampaignForm = {
  subject: string;
  senderName: string;
  senderAddress: string;
  replyToAddress: string;
  owner: string;
  type: string;
  name: string;
  status: string;
  budgetedCost: string;
  actualCost: string;
  description: string;
};

const emptyForm: CampaignForm = {
  subject: "",
  senderName: "",
  senderAddress: "",
  replyToAddress: "",
  owner: "",
  type: "",
  name: "",
  status: "",
  budgetedCost: "",
  actualCost: "",
  description: "",
};

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:focus:border-brand-500 dark:focus:bg-white/[0.05]";

const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

export default function Campaign() {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);

  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCampaigns = campaigns.filter((campaign) =>
    campaign.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleAddCampaign = (form: CampaignForm) => {
    const newCampaign: CampaignData = {
      id: Date.now(),
      name: form.name,
      type: form.type,
      status: form.status,
      subject: form.subject,
      owner: form.owner,
      budgetedCost: form.budgetedCost,
      actualCost: form.actualCost,
      senderName: form.senderName,
      senderAddress: form.senderAddress,
      replyToAddress: form.replyToAddress,
      description: form.description,
    };

    setCampaigns((previous) => [...previous, newCampaign]);

    setShowAddCampaign(false);
  };

  const handleDeleteCampaign = (id: number) => {
    setCampaigns((previous) =>
      previous.filter((campaign) => campaign.id !== id),
    );
  };

  if (showAddCampaign) {
    return (
      <AddCampaign
        onCancel={() => setShowAddCampaign(false)}
        onSave={handleAddCampaign}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Campaigns
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plan and track marketing campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <span>Home</span>
          <ChevronRight size={14} />
          <span>Marketing</span>
          <ChevronRight size={14} />

          <span className="text-gray-800 dark:text-white/90">
            Campaigns
          </span>
        </div>
      </div>

      {/* Campaign Card */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Campaigns
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Plan and track marketing campaigns.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddCampaign(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <Plus size={16} />
            Create campaign
          </button>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
            />

            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaigns"
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90 dark:placeholder:text-gray-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            Show

            <select
              className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>

            entries
          </label>
        </div>

        {/* Table */}
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[1000px] text-start">
            <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                <th className="w-12 px-5 py-3">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-500"
                    aria-label="Select all campaigns"
                  />
                </th>

                <TableHeader>CAMPAIGN NAME</TableHeader>
                <TableHeader>TYPE</TableHeader>
                <TableHeader>STATUS</TableHeader>
                <TableHeader>CAMPAIGN SUBJECT</TableHeader>
                <TableHeader>CAMPAIGN OWNER</TableHeader>
                <TableHeader>BUDGETED COST</TableHeader>
                <TableHeader>ACTUAL COST</TableHeader>

                <th className={thClass}>ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-500"
                      aria-label={`Select ${campaign.name}`}
                    />
                  </td>

                  <td className="px-3 py-4 sm:px-5">
                    <button
                      type="button"
                      className="text-sm font-medium text-brand-500 hover:text-brand-600 hover:underline"
                    >
                      {campaign.name}
                    </button>
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {campaign.type}
                  </td>

                  <td className="px-3 py-4 sm:px-5">
                    <StatusBadge status={campaign.status} />
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {campaign.subject}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {campaign.owner}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {campaign.budgetedCost}
                  </td>

                  <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                    {campaign.actualCost}
                  </td>

                  <td className="px-3 py-4 sm:px-5">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="View"
                        className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"
                      >
                        <Eye size={16} />
                      </button>

                      <button
                        type="button"
                        title="Edit"
                        className="rounded-md p-1.5 text-brand-500 transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        onClick={() =>
                          handleDeleteCampaign(campaign.id)
                        }
                        className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredCampaigns.length === 0 && (
          <div className="mx-5 my-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
            No campaigns found.
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-500 sm:p-5 dark:border-gray-800 dark:text-gray-400">
          <span>
            Showing{" "}
            <span className="font-medium text-gray-800 dark:text-white/90">
              {filteredCampaigns.length}
            </span>{" "}
            campaigns
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <button
              type="button"
              className="h-9 min-w-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white"
            >
              1
            </button>

            <button
              type="button"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Add Campaign                                                               */
/* -------------------------------------------------------------------------- */

type AddCampaignProps = {
  onCancel: () => void;
  onSave: (form: CampaignForm) => void;
};

function AddCampaign({
  onCancel,
  onSave,
}: AddCampaignProps) {
  const [form, setForm] =
    useState<CampaignForm>(emptyForm);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    onSave(form);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Campaigns
        </h1>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create and manage marketing campaigns.
        </p>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"
      >
        {/* Form Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-5 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Add campaign
          </h2>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              Save
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          {/* Campaign Details */}
          <FormSection title="Campaign details">
            <div className="grid gap-5 md:grid-cols-2">
              <FormInput
                name="campaignSubject"
                label="Campaign Subject"
                placeholder="Enter campaign"
                value={form.senderName}
                onChange={handleChange}
              />

              <FormInput
                name="senderName"
                label="Sender name"
                placeholder="Enter sender name"
                value={form.senderName}
                onChange={handleChange}
              />

              <FormInput
                name="senderAddress"
                label="Sender address"
                required
                placeholder="Enter sender address"
                value={form.senderAddress}
                onChange={handleChange}
              />

              <FormInput
                name="replyToAddress"
                label="Reply-to address"
                required
                placeholder="Enter reply-to address"
                value={form.replyToAddress}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Campaign Information */}
          <FormSection title="Campaign information">
            <div className="grid gap-5 md:grid-cols-2">
              <FormInput
                name="owner"
                label="Campaign owner"
                placeholder="Enter campaign owner"
                value={form.owner}
                onChange={handleChange}
              />

              <FormSelect
                name="type"
                label="Type"
                required
                value={form.type}
                onChange={handleChange}
              >
                <option value="">Select campaign type</option>
                <option value="Online">Online</option>
                <option value="Email Campaign">Email Campaign</option>
                <option value="Survey">Survey</option>
                <option value="Webinar">Webinar</option>
                <option value="Referral Program">Referral Program</option>
              </FormSelect>

              <FormInput
                name="name"
                label="Campaign name"
                required
                placeholder="Enter campaign name"
                value={form.name}
                onChange={handleChange}
              />

              <FormSelect
                name="status"
                label="Status"
                required
                value={form.status}
                onChange={handleChange}
              >
                <option value="">Select status</option>
                <option value="Planning">Planning</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Complete">Complete</option>
              </FormSelect>

              <FormInput
                name="budgetedCost"
                label="Budgeted cost"
                type="number"
                placeholder="Enter budgeted cost"
                value={form.budgetedCost}
                onChange={handleChange}
              />

              <FormInput
                name="actualCost"
                label="Actual cost"
                type="number"
                placeholder="Enter actual cost"
                value={form.actualCost}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Description */}
          <FormSection title="Description information">
            <div>
              <label className={labelClass}>
                Description
              </label>

              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Enter description"
                className={`${inputClass} min-h-28 resize-none`}
              />
            </div>
          </FormSection>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h3>

      {children}
    </section>
  );
}

function FormInput({
  name,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => void;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={inputClass}
      />
    </div>
  );
}

function FormSelect({
  name,
  label,
  value,
  onChange,
  children,
}: {
  name: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className={inputClass}
      >
        {children}
      </select>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-white/[0.05] dark:text-gray-300">
      {status}
    </span>
  );
}

function TableHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <th className={thClass}>
      {children}
    </th>
  );
}