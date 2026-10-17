import {
  createCampaign,
  deleteCampaign,
  getCampaign,
  listCampaigns,
  updateCampaign,
  type Campaign,
  type CampaignOwnerOption,
  type CampaignPayload,
} from "@/api/campaigns";
import { useEffect, useMemo, useState } from "react";
import { hasPermission, useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
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
  id: string;
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

function toForm(campaign: Campaign): CampaignForm {
  return {
    subject: campaign.campaign_subject,
    senderName: campaign.sender_name ?? "",
    senderAddress: campaign.sender_address,
    replyToAddress: campaign.reply_to_address,
    owner: campaign.campaign_owner_id ?? "",
    type: campaign.type,
    name: campaign.campaign_name,
    status: campaign.status ?? "",
    budgetedCost: campaign.budgeted_cost == null ? "" : String(campaign.budgeted_cost),
    actualCost: campaign.actual_cost == null ? "" : String(campaign.actual_cost),
    description: campaign.description ?? "",
  };
}

function toCampaignData(
  campaign: Campaign,
  owners: CampaignOwnerOption[],
): CampaignData {
  return {
    id: campaign.id,
    name: campaign.campaign_name,
    type: campaign.type,
    status: campaign.status ?? "",
    subject: campaign.campaign_subject,
    owner:
      owners.find((owner) => owner.id === campaign.campaign_owner_id)?.name ??
      campaign.campaign_owner_id ??
      "",
    budgetedCost: campaign.budgeted_cost == null ? "" : String(campaign.budgeted_cost),
    actualCost: campaign.actual_cost == null ? "" : String(campaign.actual_cost),
    senderName: campaign.sender_name ?? "",
    senderAddress: campaign.sender_address,
    replyToAddress: campaign.reply_to_address,
    description: campaign.description ?? "",
  };
}

function toPayload(form: CampaignForm): CampaignPayload {
  const numberOrNull = (value: string) => {
    if (!value.trim()) return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  };

  return {
    campaign_subject: form.subject.trim(),
    sender_name: form.senderName.trim() || null,
    sender_address: form.senderAddress.trim(),
    reply_to_address: form.replyToAddress.trim(),
    campaign_owner_id: form.owner || null,
    campaign_name: form.name.trim(),
    type: form.type,
    status: form.status || null,
    budgeted_cost: numberOrNull(form.budgetedCost),
    actual_cost: numberOrNull(form.actualCost),
    description: form.description.trim() || null,
  };
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:focus:border-brand-500 dark:focus:bg-white/[0.05]";

const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

export default function Campaign() {
  const { user } = useAuth();
  const canView = hasPermission(user, "Campaigns", "view");
  const canCreate = hasPermission(user, "Campaigns", "create");
  const canUpdate = hasPermission(user, "Campaigns", "update");
  const canDelete = hasPermission(user, "Campaigns", "delete");
  const { currentWorkspace } = useWorkspace();
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [viewingCampaign, setViewingCampaign] = useState(false);
  const [owners, setOwners] = useState<CampaignOwnerOption[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(5);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setCampaigns([]);
    setTotal(0);
    setLoading(true);
    void listCampaigns({
      search,
      page,
      perPage,
      includeOptions: page === 1,
    })
      .then((response) => {
        if (!("items" in response.campaigns)) {
          throw new Error("The server returned an invalid campaign list.");
        }
        setCampaigns(
          response.campaigns.items.map((campaign) =>
            toCampaignData(campaign, response.options?.owners ?? owners),
          ),
        );
        setTotal(response.campaigns.total);
        if (response.options?.owners) setOwners(response.options.owners);
        setError("");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Unable to load campaigns.");
      })
      .finally(() => setLoading(false));
  }, [currentWorkspace?.id, page, perPage, search]);

  const handleSaveCampaign = async (form: CampaignForm) => {
    if (editingCampaign ? !canUpdate : !canCreate) return;
    setSaving(true);
    try {
      const saved = editingCampaign
        ? await updateCampaign(editingCampaign.id, toPayload(form))
        : await createCampaign(toPayload(form));
      const savedData = toCampaignData(saved, owners);
      setCampaigns((previous) =>
        editingCampaign
          ? previous.map((campaign) =>
              campaign.id === savedData.id ? savedData : campaign,
            )
          : [savedData, ...previous],
      );
      setTotal((current) => (editingCampaign ? current : current + 1));
      setEditingCampaign(null);
      setShowAddCampaign(false);
      setError("");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to save campaign.");
      throw reason;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!canDelete) return;
    if (!window.confirm("Delete this campaign?")) return;
    try {
      await deleteCampaign(id);
      setCampaigns((previous) => previous.filter((campaign) => campaign.id !== id));
      setTotal((current) => Math.max(0, current - 1));
      setError("");
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to delete campaign.");
    }
  };

  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const filteredCampaigns = useMemo(() => campaigns, [campaigns]);
  const visibleIds = filteredCampaigns.map((campaign) => campaign.id);
  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const selectedCount = selectedIds.length;

  const toggleAll = () => {
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  };

  const bulkDelete = async () => {
    if (!canDelete || !selectedIds.length || !window.confirm(`Delete ${selectedIds.length} campaigns?`)) return;
    try {
      await Promise.all(selectedIds.map((id) => deleteCampaign(id)));
      setCampaigns((current) => current.filter((campaign) => !selectedIds.includes(campaign.id)));
      setTotal((current) => Math.max(0, current - selectedIds.length));
      setSelectedIds([]);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to delete campaigns.");
    }
  };

  if (showAddCampaign || editingCampaign) {
    return (
      <AddCampaign
        onCancel={() => {
          setShowAddCampaign(false);
          setEditingCampaign(null);
          setViewingCampaign(false);
        }}
        onSave={handleSaveCampaign}
        initialForm={editingCampaign ? toForm(editingCampaign) : emptyForm}
        owners={owners}
        saving={saving}
        readOnly={viewingCampaign}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Campaigns" parent={{ label: "Marketing" }} />

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
          {canCreate && <button
            type="button"
            onClick={() => {
              setEditingCampaign(null);
              setShowAddCampaign(true);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            <Plus size={16} />
            Create campaign
          </button>}
        </div>

        {error && (
          <div role="alert" className="mx-5 mt-5 rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">
            {error}
          </div>
        )}

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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search campaigns"
              className="h-11 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90 dark:placeholder:text-gray-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            Show

            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
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
{canDelete && selectedCount > 0 && (
            <div className="flex items-center justify-between border-b border-gray-200 bg-blue-50 px-5 py-3 text-sm dark:border-gray-800 dark:bg-white/5">
              <span>{selectedCount} selected</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-transparent">
                  Clear selection
                </button>
                <button type="button" onClick={() => void bulkDelete()} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white">
                  Delete {selectedCount}
                </button>
              </div>
            </div>
          )}
        {/* Table */}
        <div className="custom-scrollbar overflow-x-auto">
          <table className="w-full min-w-[1000px] text-start">
            <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
              <tr>
                {canDelete && <th className="w-12 px-5 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="size-4 accent-brand-500"
                    aria-label="Select all campaigns"
                  />
                </th>}

                <TableHeader>CAMPAIGN NAME</TableHeader>
                <TableHeader>TYPE</TableHeader>
                <TableHeader>STATUS</TableHeader>
                <TableHeader>CAMPAIGN SUBJECT</TableHeader>
                <TableHeader>CAMPAIGN OWNER</TableHeader>
                <TableHeader>BUDGETED COST</TableHeader>
                <TableHeader>ACTUAL COST</TableHeader>

                {(canUpdate || canDelete) && <th className={thClass}>ACTIONS</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={9} className="px-5 py-10 text-center text-sm text-gray-500">Loading campaigns...</td></tr>
              ) : filteredCampaigns.map((campaign) => (
                <tr
                  key={campaign.id}
                  className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                >
                  {canDelete && <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(campaign.id)}
                      onChange={() =>
                        setSelectedIds((current) =>
                          current.includes(campaign.id)
                            ? current.filter((id) => id !== campaign.id)
                            : [...current, campaign.id],
                        )
                      }
                      className="size-4 accent-brand-500"
                      aria-label={`Select ${campaign.name}`}
                    />
                  </td>}

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

                  {(canView || canUpdate || canDelete) && <td className="px-3 py-4 sm:px-5">
                    <div className="flex items-center gap-1">
                      {canView && <button
                        type="button"
                        title="View"
                        onClick={() => {
                          void getCampaign(campaign.id)
                            .then((source) => {
                              setEditingCampaign(source);
                              setViewingCampaign(true);
                              setShowAddCampaign(false);
                            })
                            .catch((reason: unknown) =>
                              setError(reason instanceof Error ? reason.message : "Unable to load campaign."),
                            );
                        }}
                        className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-white/[0.05] dark:hover:text-gray-300"
                      >
                        <Eye size={16} />
                      </button>}

                      {canUpdate && <button
                        type="button"
                        title="Edit"
                        onClick={() => {
                          void getCampaign(campaign.id)
                            .then((source) => {
                              setEditingCampaign(source);
                              setViewingCampaign(false);
                              setShowAddCampaign(false);
                            })
                            .catch((reason: unknown) =>
                              setError(reason instanceof Error ? reason.message : "Unable to load campaign."),
                            );
                        }}
                        className="rounded-md p-1.5 text-brand-500 transition hover:bg-brand-50 dark:hover:bg-brand-500/10"
                      >
                        <Pencil size={16} />
                      </button>}

                      {canDelete && <button
                        type="button"
                        title="Delete"
                        onClick={() =>
                          handleDeleteCampaign(campaign.id)
                        }
                        className="rounded-md p-1.5 text-error-500 transition hover:bg-error-50 dark:hover:bg-error-500/10"
                      >
                        <Trash2 size={16} />
                      </button>}
                    </div>
                  </td>}
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
              {total}
            </span>{" "}
            campaigns
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-500 transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            <button
              type="button"
              className="h-9 min-w-9 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white"
            >
              {page}
            </button>

            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
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
  onSave: (form: CampaignForm) => Promise<void>;
  initialForm?: CampaignForm;
  owners: CampaignOwnerOption[];
  saving: boolean;
  readOnly?: boolean;
};

function AddCampaign({
  onCancel,
  onSave,
  initialForm = emptyForm,
  owners,
  saving,
  readOnly = false,
}: AddCampaignProps) {
  const [form, setForm] = useState<CampaignForm>(initialForm);
  const [formError, setFormError] = useState("");

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
    if (readOnly) return;

    setFormError("");
    void onSave(form).catch((reason: unknown) => {
      setFormError(
        reason instanceof Error ? reason.message : "Unable to save campaign.",
      );
    });
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
            {readOnly ? "View campaign" : initialForm === emptyForm ? "Add campaign" : "Edit campaign"}
          </h2>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="h-10 rounded-lg border border-gray-200 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
            >
              Cancel
            </button>

            {!readOnly && <button
              type="submit"
              className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              {saving ? "Saving..." : "Save"}
            </button>}
          </div>
        </div>

        {formError && (
          <div
            role="alert"
            className="mx-5 mt-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
          >
            {formError}
          </div>
        )}

        <fieldset disabled={readOnly} className="space-y-6 p-5 sm:p-6">
          {/* Campaign Details */}
          <FormSection title="Campaign details">
            <div className="grid gap-5 md:grid-cols-2">
              <FormInput
                name="subject"
                label="Campaign Subject"
                required
                placeholder="Enter campaign"
                value={form.subject}
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
                type="email"
                placeholder="Enter sender address"
                value={form.senderAddress}
                onChange={handleChange}
              />

              <FormInput
                name="replyToAddress"
                label="Reply-to address"
                required
                type="email"
                placeholder="Enter reply-to address"
                value={form.replyToAddress}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          {/* Campaign Information */}
          <FormSection title="Campaign information">
            <div className="grid gap-5 md:grid-cols-2">
              <FormSelect
                name="owner"
                label="Campaign owner"
                value={form.owner}
                onChange={handleChange}
              >
                <option value="">Select campaign owner</option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name}
                  </option>
                ))}
              </FormSelect>

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
        </fieldset>
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
  required = false,
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
        required={required}
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
  required = false,
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
        required={required}
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
