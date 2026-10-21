import {
  listContactStage,
  updateContact,
  type Contact,
} from "@/api/contacts";
import {
  createEmailMarketingCampaign,
  deleteEmailMarketingCampaign,
  getEmailMarketingCampaign,
  getEmailMarketingReport,
  getEmailMarketingRecipients,
  listEmailMarketingCampaigns,
  replicateEmailMarketingCampaign,
  scheduleEmailMarketingCampaign,
  setEmailMarketingRecipientEnabled,
  type EmailMarketingCampaign as ApiEmailCampaign,
  type EmailMarketingReport,
  type EmailMarketingRecipient,
} from "@/api/emailMarketing";
import { listTags, type Tag } from "@/api/tags";
import { useWorkspace } from "@/context/WorkspaceContext";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { hasPermission, useAuth } from "@/context/AuthContext";
import {
  Mail,
  X,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

type MailType = "test" | "bulk";

type EmailCampaign = {
  id: string;
  campaignName: string;
  subject: string;
  status: string;
  platform: string;
  sendTo: number;
  opens: number;
  clicks: number;
  lastEdited: string;
  sender: string;
  content: string;
  mailType: MailType;
  testEmail: string;
  tagId: string;
  scheduledAt: string | null;
};

type EmailCampaignForm = {
  campaignName: string;
  sender: string;
  testEmail: string;
  tagId: string;
  subject: string;
  content: string;
  mailType: MailType;
  platform: string;
  scheduledAt: string;
};

function fromApiCampaign(campaign: ApiEmailCampaign): EmailCampaign {
  return {
    id: campaign.id,
    campaignName: campaign.campaign_name,
    subject: campaign.subject,
    status: campaign.status,
    platform: campaign.platform,
    sendTo: campaign.sent_count,
    opens: campaign.open_count,
    clicks: campaign.click_count,
    lastEdited: campaign.updated_at
      ? new Date(campaign.updated_at).toLocaleString()
      : new Date(campaign.created_at).toLocaleString(),
    sender: campaign.from_email,
    content: campaign.content,
    mailType: campaign.mail_type === "Test Email" ? "test" : "bulk",
    testEmail: campaign.to_email ?? "",
    tagId: campaign.tag_id ?? "",
    scheduledAt: campaign.scheduled_at,
  };
}

function fromApiListItem(campaign: {
  id: string;
  campaign_name: string;
  subject: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  updated_at: string | null;
  scheduled_at: string | null;
}): EmailCampaign {
  return {
    id: campaign.id,
    campaignName: campaign.campaign_name,
    subject: campaign.subject,
    status: campaign.status,
    platform: "Email",
    sendTo: campaign.sent_count,
    opens: campaign.open_count,
    clicks: campaign.click_count,
    lastEdited: campaign.updated_at
      ? new Date(campaign.updated_at).toLocaleString()
      : "—",
    sender: "",
    content: "",
    mailType: "bulk",
    testEmail: "",
    tagId: "",
    scheduledAt: campaign.scheduled_at,
  };
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function currentDateTimeLocal(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/[0.03] dark:text-white/90 dark:focus:border-brand-500 dark:focus:bg-white/[0.05]";

const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

const thClass =
  "px-3 py-3 text-start text-xs font-medium tracking-wide whitespace-nowrap text-gray-500 uppercase sm:px-5 dark:text-gray-400";

/* -------------------------------------------------------------------------- */
/* Email Recipient Modal                                                      */
/* -------------------------------------------------------------------------- */

function EmailListModal({
  contacts,
  tagName,
  onClose,
  onToggleContact,
}: {
  contacts: Contact[];
  tagName: string;
  onClose: () => void;
  onToggleContact?: (contact: Contact) => Promise<void>;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const totalPages = Math.max(
    1,
    Math.ceil(contacts.length / perPage),
  );

  const currentPage = Math.min(page, totalPages);

  const visibleContacts = contacts.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-950/50 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-list-title"
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-theme-xl dark:bg-gray-dark"
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2
              id="email-list-title"
              className="text-lg font-semibold text-gray-800 dark:text-white/90"
            >
              Send E-mail List
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {contacts.length}{" "}
              {contacts.length === 1 ? "person" : "people"} in{" "}
              {tagName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close recipient list"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          <label className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 dark:border-gray-800 dark:bg-gray-900"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            entries per page
          </label>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-white/[0.03]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    S.No
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                    Email
                  </th>

                  {onToggleContact && <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Action
                  </th>}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleContacts.map((contact, index) => (
                  <tr key={contact.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {(currentPage - 1) * perPage + index + 1}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                      {contact.email}
                    </td>

                    {onToggleContact && <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={updatingId === contact.id}
                        onClick={() => {
                          if (!onToggleContact) return;
                          setUpdatingId(contact.id);

                          void onToggleContact(contact).finally(() =>
                            setUpdatingId(null),
                          );
                        }}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${
                          contact.email_opt_out
                            ? "bg-error-500 hover:bg-error-600"
                            : "bg-success-600 hover:bg-success-700"
                        }`}
                      >
                        {updatingId === contact.id
                          ? "Saving..."
                          : contact.email_opt_out
                            ? "Disable"
                            : "Enable"}
                      </button>
                    </td>}
                  </tr>
                ))}

                {!visibleContacts.length && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      No recipients found for this tag.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing{" "}
            {contacts.length
              ? (currentPage - 1) * perPage + 1
              : 0}{" "}
            to{" "}
            {Math.min(
              currentPage * perPage,
              contacts.length,
            )}{" "}
            of {contacts.length}
          </span>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* View Campaign Modal                                                        */
/* -------------------------------------------------------------------------- */

function ViewCampaignModal({
  campaign,
  onClose,
  canUpdateRecipients,
  onCampaignUpdate,
}: {
  campaign: EmailCampaign;
  onClose: () => void;
  canUpdateRecipients: boolean;
  onCampaignUpdate: (campaign: EmailCampaign) => void;
}) {
  const [campaignDetails, setCampaignDetails] = useState(campaign);
  const [scheduleValue, setScheduleValue] = useState(() => toDateTimeLocal(campaign.scheduledAt));
  const [recipients, setRecipients] = useState<EmailMarketingRecipient[]>([]);
  const [recipientsError, setRecipientsError] = useState("");
  const [updatingRecipientId, setUpdatingRecipientId] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState("");
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    setCampaignDetails(campaign);
    setScheduleValue(toDateTimeLocal(campaign.scheduledAt));
  }, [campaign]);

  useEffect(() => {
    let active = true;
    void getEmailMarketingRecipients(campaign.id)
      .then((items) => { if (active) setRecipients(items); })
      .catch((error: unknown) => {
        if (active) setRecipientsError(error instanceof Error ? error.message : "Unable to load recipients.");
      });
    return () => { active = false; };
  }, [campaign.id]);

  async function toggleRecipient(recipient: EmailMarketingRecipient) {
    setUpdatingRecipientId(recipient.id);
    setRecipientsError("");
    try {
      const updated = await setEmailMarketingRecipientEnabled(recipient.id, !recipient.is_enabled);
      setRecipients((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      setRecipientsError(error instanceof Error ? error.message : "Unable to update recipient.");
    } finally {
      setUpdatingRecipientId(null);
    }
  }

  async function saveSchedule() {
    if (!scheduleValue) {
      setScheduleError("Choose a future send time.");
      return;
    }
    if (new Date(scheduleValue).getTime() <= Date.now()) {
      setScheduleError("Scheduled send time must be in the future.");
      return;
    }
    setIsScheduling(true);
    setScheduleError("");
    try {
      const updated = await scheduleEmailMarketingCampaign(
        campaignDetails.id,
        new Date(scheduleValue).toISOString(),
      );
      const mapped = fromApiCampaign(updated);
      setCampaignDetails(mapped);
      onCampaignUpdate(mapped);
      setScheduleValue(toDateTimeLocal(mapped.scheduledAt));
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : "Unable to update schedule.");
    } finally {
      setIsScheduling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-theme-xl dark:bg-gray-dark">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Campaign details
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              View campaign information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-6">
          <DetailRow
            label="Campaign name"
            value={campaignDetails.campaignName}
          />

          <DetailRow
            label="Subject"
            value={campaignDetails.subject}
          />

          <DetailRow
            label="Sender"
            value={campaignDetails.sender}
          />

          <DetailRow
            label="Mail type"
            value={
              campaignDetails.mailType === "test"
                ? "Test email"
                : "Send bulk email"
            }
          />

          <DetailRow label="Platform" value={campaignDetails.platform} />

          <DetailRow
            label="Scheduled send"
            value={campaignDetails.scheduledAt ? new Date(campaignDetails.scheduledAt).toLocaleString() : "Immediate"}
          />

          <DetailRow
            label="Sent"
            value={String(campaignDetails.sendTo)}
          />

          <DetailRow
            label="Status"
            value={campaignDetails.status}
          />

          <div>
            <p className={labelClass}>Content</p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              {campaignDetails.content}
            </div>
          </div>

          {canUpdateRecipients && ["Queued", "Scheduled"].includes(campaignDetails.status) && (
            <div>
              <label className={labelClass} htmlFor="campaign-scheduled-at">Change send time</label>
              <div className="flex flex-wrap gap-2">
                <input
                  id="campaign-scheduled-at"
                  type="datetime-local"
                  min={currentDateTimeLocal()}
                  value={scheduleValue}
                  onChange={(event) => setScheduleValue(event.target.value)}
                  className={`${inputClass} min-w-0 flex-1`}
                />
                <button
                  type="button"
                  disabled={isScheduling}
                  onClick={() => void saveSchedule()}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isScheduling ? "Saving…" : "Update schedule"}
                </button>
              </div>
              {scheduleError && <p role="alert" className="mt-2 text-sm text-error-600">{scheduleError}</p>}
            </div>
          )}

          <div>
            <p className={labelClass}>Recipients ({recipients.length})</p>
            {recipientsError && <p role="alert" className="mb-2 text-sm text-error-600">{recipientsError}</p>}
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 dark:border-gray-800">
              {recipients.length ? recipients.map((recipient) => (
                <div key={recipient.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-gray-700 dark:text-gray-300">{recipient.email}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={recipient.is_enabled ? "text-success-600" : "text-gray-500"}>
                      {recipient.is_enabled ? "Enabled" : "Disabled"}
                    </span>
                    {canUpdateRecipients && <button
                      type="button"
                      disabled={updatingRecipientId === recipient.id}
                      onClick={() => void toggleRecipient(recipient)}
                      className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
                    >
                      {updatingRecipientId === recipient.id ? "Saving…" : recipient.is_enabled ? "Disable" : "Enable"}
                    </button>}
                  </span>
                </div>
              )) : <p className="text-sm text-gray-500">No recipients found.</p>}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Report Modal                                                               */
/* -------------------------------------------------------------------------- */

function ReportCampaignModal({
  campaign,
  report,
  onClose,
}: {
  campaign: EmailCampaign;
  report: EmailMarketingReport | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-99999 flex items-center justify-center bg-gray-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="w-full max-w-lg rounded-2xl bg-white shadow-theme-xl dark:bg-gray-dark">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-gray-800">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Campaign report
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {campaign.campaignName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 p-6">
          <ReportCard
            label="Sent"
            value={report?.sent ?? campaign.sendTo}
          />

          <ReportCard
            label="Opens"
            value={report?.opens ?? campaign.opens}
          />

          <ReportCard
            label="Clicks"
            value={report?.clicks ?? campaign.clicks}
          />
        </div>

        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last edited
          </p>

          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {report?.last_edited ? new Date(report.last_edited).toLocaleString() : campaign.lastEdited}
          </p>
        </div>

        <div className="flex justify-end border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            Close
          </button>
        </div>
      </section>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Email Marketing Page                                                  */
/* -------------------------------------------------------------------------- */

export default function EmailMarketing() {
  const { user } = useAuth();
  const canCreate = hasPermission(user, "Email Marketing", "create");
  const canUpdate = hasPermission(user, "Email Marketing", "update");
  const canDelete = hasPermission(user, "Email Marketing", "delete");
  const { currentWorkspace } = useWorkspace();
  const workspaceKey = currentWorkspace?.id ?? "__all_workspaces__";
  const [showNewCampaign, setShowNewCampaign] =
    useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [campaignsByWorkspace, setCampaignsByWorkspace] =
    useState<Record<string, EmailCampaign[]>>({});
  const campaigns = campaignsByWorkspace[workspaceKey] ?? [];
  const setCampaigns = (update: (current: EmailCampaign[]) => EmailCampaign[]) =>
    setCampaignsByWorkspace((current) => ({
      ...current,
      [workspaceKey]: update(current[workspaceKey] ?? []),
    }));

  const [search, setSearch] = useState("");

  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaign | null>(null);

  const [showViewModal, setShowViewModal] =
    useState(false);

  const [showReportModal, setShowReportModal] =
    useState(false);
  const [campaignReport, setCampaignReport] = useState<EmailMarketingReport | null>(null);

  const [replicateCampaign, setReplicateCampaign] =
    useState<EmailCampaign | null>(null);

  const filteredCampaigns = campaigns.filter(
    (campaign) =>
      campaign.campaignName
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      campaign.subject
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  /* ---------------------------------------------------------------------- */
  /* Add Campaign                                                           */
  /* ---------------------------------------------------------------------- */

  const refreshCampaigns = async () => {
    setIsLoading(true);
    setPageError("");
    try {
      const result = await listEmailMarketingCampaigns();
      setCampaignsByWorkspace((current) => ({
        ...current,
        [workspaceKey]: result.map(fromApiListItem),
      }));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load campaigns.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshCampaigns();
  }, [workspaceKey]);

  const handleAddCampaign = async (form: EmailCampaignForm) => {
    if (!canCreate) return;
    if (!currentWorkspace?.id) {
      setPageError("Open a workspace before creating an email campaign.");
      setShowNewCampaign(false);
      return;
    }
    setIsSaving(true);
    setPageError("");
    try {
      await createEmailMarketingCampaign({
        workspace_id: currentWorkspace.id,
        campaign_name: form.campaignName,
        platform: form.platform,
        from_email: form.sender,
        mail_type: form.mailType === "test" ? "Test Email" : "Bulk Email",
        to_email: form.mailType === "test" ? form.testEmail : null,
        tag_id: form.mailType === "bulk" ? form.tagId : null,
        selection_mode: form.mailType === "bulk" ? "all" : null,
        selected_user_ids: [],
        subject: form.subject,
        content: form.content,
        scheduled_at: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
      });
      await refreshCampaigns();
      setReplicateCampaign(null);
      setShowNewCampaign(false);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to create campaign.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* View                                                                   */
  /* ---------------------------------------------------------------------- */

  const handleViewCampaign = async (campaign: EmailCampaign) => {
    try {
      const detail = await getEmailMarketingCampaign(campaign.id);
      setSelectedCampaign(fromApiCampaign(detail));
      setShowViewModal(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load campaign.");
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Report                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleReportCampaign = async (campaign: EmailCampaign) => {
    try {
      setCampaignReport(await getEmailMarketingReport(campaign.id));
      setSelectedCampaign(campaign);
      setShowReportModal(true);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to load campaign report.");
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Replicate                                                              */
  /* ---------------------------------------------------------------------- */

  const handleReplicateCampaign = async (campaign: EmailCampaign) => {
    if (!canCreate) return;
    try {
      const replicated = await replicateEmailMarketingCampaign(campaign.id);
      setCampaigns((previous) => [fromApiCampaign(replicated), ...previous]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to replicate campaign.");
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Delete                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleDeleteCampaign = async (id: string) => {
    if (!canDelete) return;
    try {
      await deleteEmailMarketingCampaign(id);
      setCampaigns((previous) => previous.filter((campaign) => campaign.id !== id));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Unable to delete campaign.");
    }
  };

  useEffect(() => {
    setShowNewCampaign(false);
    setReplicateCampaign(null);
    setSelectedCampaign(null);
    setShowViewModal(false);
    setShowReportModal(false);
  }, [workspaceKey]);

  /* ---------------------------------------------------------------------- */
  /* New Campaign Page                                                      */
  /* ---------------------------------------------------------------------- */

  if (showNewCampaign) {
    return (
      <EmailCampaignForm
        initialCampaign={replicateCampaign}
        onCancel={() => {
          setReplicateCampaign(null);
          setShowNewCampaign(false);
        }}
        onSave={handleAddCampaign}
        isSaving={isSaving}
      />
    );
  }

  return (
    <>
      <PageMeta
        title="Email marketing | Yatzar Operations"
        description="Create and send email marketing campaigns."
      />

      <PageBreadcrumb
        pageTitle="Email marketing"
        parent={{ label: "Marketing" }}
      />

      <div className="space-y-6">

        {/* Campaign Card */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          {/* Header */}

          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Email marketing
              </h2>

              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Create, send and track email campaigns.
              </p>
            </div>

            {canCreate && <button
              type="button"
              onClick={() => {
                setReplicateCampaign(null);
                setShowNewCampaign(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              <Plus size={16} />
              New campaign
            </button>}
          </div>

          {pageError && <div role="alert" className="mx-5 mt-4 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{pageError}</div>}

          {/* Search / Entries */}

          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-gray-800">
            <div className="relative w-full sm:max-w-xs">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search campaigns"
                className="h-11 w-full rounded-lg border border-gray-200 bg-transparent pl-9 pr-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:text-white/90 dark:placeholder:text-gray-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              Show

              <select className="h-9 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-700 outline-none dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
                <option value="10">
                  10
                </option>

                <option value="25">
                  25
                </option>

                <option value="50">
                  50
                </option>
              </select>

              entries per page
            </label>
          </div>

          {/* Table */}

          <div className="custom-scrollbar overflow-x-auto">
            <table className="w-full min-w-[1100px] text-start">
              <thead className="border-y border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                <tr>
                  <TableHeader>S.NO</TableHeader>
                  <TableHeader>
                    CAMPAIGN NAME
                  </TableHeader>
                  <TableHeader>SUBJECT</TableHeader>
                  <TableHeader>STATUS</TableHeader>
                  <TableHeader>SCHEDULE</TableHeader>
                  <TableHeader>SENT</TableHeader>
                  <TableHeader>ANALYTICS</TableHeader>
                  <TableHeader>LAST EDITED</TableHeader>
                  <TableHeader>ACTIONS</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!isLoading && filteredCampaigns.map(
                  (campaign, index) => (
                    <tr
                      key={campaign.id}
                      className="transition hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                    >
                      <td className="px-3 py-4 text-sm text-gray-500 sm:px-5">
                        {index + 1}
                      </td>

                      <td className="px-3 py-4 sm:px-5">
                        <button
                          type="button"
                          onClick={() =>
                            handleViewCampaign(
                              campaign,
                            )
                          }
                          className="text-sm font-medium text-gray-800 hover:text-brand-500 dark:text-white/90"
                        >
                          {campaign.campaignName}
                        </button>
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                        {campaign.subject}
                      </td>

                      <td className="px-3 py-4 sm:px-5">
                        <StatusBadge
                          status={campaign.status}
                        />
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                        {campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleString()
                          : "Immediate"}
                      </td>

                      {/* SEND TO IS A NUMBER */}

                      <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                        {campaign.sendTo}
                      </td>

                      {/* ANALYTICS */}

                      <td className="px-3 py-4 sm:px-5">
                        <div className="flex gap-5 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <p>Opens</p>

                            <p className="mt-1 text-center font-medium text-gray-800 dark:text-white/90">
                              {campaign.opens}
                            </p>
                          </div>

                          <div>
                            <p>Clicks</p>

                            <p className="mt-1 text-center font-medium text-gray-800 dark:text-white/90">
                              {campaign.clicks}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-sm text-gray-600 sm:px-5 dark:text-gray-300">
                        {campaign.lastEdited}
                      </td>

                      {/* FOUR ACTION BUTTONS */}

                      <td className="px-3 py-4 sm:px-5">
                        <div className="flex items-center gap-1">
                          {/* VIEW */}

                          <button
                            type="button"
                            title="View"
                            onClick={() =>
                              handleViewCampaign(
                                campaign,
                              )
                            }
                            className="rounded-md bg-success-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-success-700"
                          >
                            View
                          </button>

                          {/* REPORT */}

                          <button
                            type="button"
                            title="Report"
                            onClick={() =>
                              handleReportCampaign(
                                campaign,
                              )
                            }
                            className="rounded-md bg-blue-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-600"
                          >
                            Report
                          </button>

                          {/* REPLICATE */}

                          {canCreate && <button
                            type="button"
                            title="Replicate"
                            onClick={() =>
                              handleReplicateCampaign(
                                campaign,
                              )
                            }
                            className="rounded-md bg-warning-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-warning-600"
                          >
                            Replicate
                          </button>}

                          {/* DELETE */}

                          {canDelete && <button
                            type="button"
                            title="Delete"
                            onClick={() =>
                              handleDeleteCampaign(
                                campaign.id,
                              )
                            }
                            className="rounded-md bg-error-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-error-600"
                          >
                            Delete
                          </button>}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* Empty State */}

          {isLoading ? (
            <div className="mx-5 my-5 py-10 text-center text-sm text-gray-500">Loading campaigns…</div>
          ) : filteredCampaigns.length === 0 && (
            <div className="mx-5 my-5 rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-white/[0.02] dark:text-gray-400">
              No email campaigns found.
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
                disabled
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-600 transition disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-800 dark:text-gray-300"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* View Modal */}

      {showViewModal && selectedCampaign && (
        <ViewCampaignModal
          campaign={selectedCampaign}
          canUpdateRecipients={canUpdate}
          onCampaignUpdate={(updated) => {
            setSelectedCampaign(updated);
            setCampaigns((current) => current.map((item) => item.id === updated.id ? updated : item));
          }}
          onClose={() => {
            setShowViewModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}

      {/* Report Modal */}

      {showReportModal && selectedCampaign && (
        <ReportCampaignModal
          campaign={selectedCampaign}
          report={campaignReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedCampaign(null);
          }}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* New Email Campaign Form                                                    */
/* -------------------------------------------------------------------------- */

function EmailCampaignForm({
  initialCampaign,
  onCancel,
  onSave,
  isSaving,
}: {
  initialCampaign: EmailCampaign | null;
  onCancel: () => void;
  onSave: (form: EmailCampaignForm) => Promise<void>;
  isSaving: boolean;
}) {
  const { user } = useAuth();
  const canUpdateContacts = hasPermission(user, "Contacts", "update");
  const { currentWorkspace } = useWorkspace();
  const [mailType, setMailType] =
    useState<MailType>(
      initialCampaign?.mailType ?? "test",
    );

  const [campaignName, setCampaignName] =
    useState(
      initialCampaign?.campaignName ?? "",
    );

  const [platform, setPlatform] = useState(initialCampaign?.platform ?? "Email");

  const [sender, setSender] = useState(
    initialCampaign?.sender ?? "",
  );

  const [testEmail, setTestEmail] =
    useState(
      initialCampaign?.testEmail ?? "",
    );

  const [tagId, setTagId] = useState(
    initialCampaign?.tagId ?? "",
  );

  const [subject, setSubject] = useState(
    initialCampaign?.subject ?? "",
  );

  const [content, setContent] = useState(
    initialCampaign?.content ?? "",
  );

  const [scheduledAt, setScheduledAt] = useState(() => {
    return toDateTimeLocal(initialCampaign?.scheduledAt ?? null);
  });

  const [tags, setTags] = useState<Tag[]>([]);
  const [contacts, setContacts] =
    useState<Contact[]>([]);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showRecipients, setShowRecipients] =
    useState(false);

  useEffect(() => {
    setTags([]);
    setContacts([]);
    void Promise.all([
      listTags(),
      listContactStage("contact"),
    ])
      .then(
        ([loadedTags, loadedContacts]) => {
          setTags(loadedTags);

          setContacts(
            loadedContacts.filter(
              (contact) =>
                Boolean(contact.email),
            ),
          );
        },
      )
      .catch((requestError: unknown) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load tags and contacts.",
        );
      });
  }, [currentWorkspace?.id]);

  const selectedTag = tags.find(
    (tag) => tag.id === tagId,
  );

  const bulkRecipients = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          contact.tag_id === tagId,
      ),
    [contacts, tagId],
  );

  async function toggleEmailOptOut(
    contact: Contact,
  ) {
    if (!canUpdateContacts) return;
    try {
      const updatedContact =
        await updateContact(
          contact.id,
          {
            email_opt_out:
              !contact.email_opt_out,
          },
        );

      setContacts((current) =>
        current.map((item) =>
          item.id === updatedContact.id
            ? updatedContact
            : item,
        ),
      );
    } catch (requestError: unknown) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update email status.",
      );
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setNotice("");

    if (scheduledAt && new Date(scheduledAt).getTime() <= Date.now()) {
      setError("Scheduled send time must be in the future.");
      return;
    }

    if (
      !campaignName.trim() ||
      !sender.trim() ||
      !subject.trim() ||
      !content.trim()
    ) {
      setError(
        "Campaign name, sender, subject, and content are required.",
      );

      return;
    }

    /* -------------------------------------------------------------- */
    /* TEST EMAIL                                                      */
    /* -------------------------------------------------------------- */

    if (mailType === "test") {
      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          testEmail.trim(),
        )
      ) {
        setError(
          "Enter one valid test email address.",
        );

        return;
      }

      /*
       * Test email = 1 recipient
       */

      try {
        await onSave({
          campaignName: campaignName.trim(),
          sender: sender.trim(),
          testEmail: testEmail.trim(),
          tagId: "",
          subject: subject.trim(),
          content: content.trim(),
          mailType,
          platform,
          scheduledAt,
        });
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unable to queue campaign.");
      }

      return;
    }

    /* -------------------------------------------------------------- */
    /* BULK EMAIL                                                      */
    /* -------------------------------------------------------------- */

    if (!selectedTag) {
      setError(
        "Select a tag for the bulk email.",
      );

      return;
    }

    /*
     * Bulk email = number of contacts
     * inside selected tag
     */

    try {
      await onSave({
        campaignName: campaignName.trim(),
        sender: sender.trim(),
        testEmail: "",
        tagId,
        subject: subject.trim(),
        content: content.trim(),
        mailType,
        platform,
        scheduledAt,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to queue campaign.");
    }
  }

  return (
    <>
      <PageMeta
        title="New campaign | Yatzar Operations"
        description="Create and send email marketing campaigns."
      />

      <PageBreadcrumb
        pageTitle="New campaign"
        parent={{
          label: "Email marketing",
        }}
      />

      <div className="space-y-6">
        {/* Header */}

        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Email marketing
          </h1>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Create and send email marketing
            campaigns.
          </p>
        </div>

        {/* Form + Preview */}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"
          >
            <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
              <span className="rounded-xl bg-brand-50 p-3 text-brand-500 dark:bg-brand-500/15">
                <Mail size={20} />
              </span>

              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  New campaign
                </h2>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Send a test or bulk email to
                  your contacts.
                </p>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mb-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700"
              >
                {notice}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Campaign name */}

              <label>
                <span className={labelClass}>
                  Campaign name
                </span>

                <input
                  value={campaignName}
                  onChange={(event) =>
                    setCampaignName(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="Campaign name"
                />
              </label>

              {/* Platform */}

              <label>
                <span className={labelClass}>
                  Platform
                </span>

                <select
                  value={platform}
                  onChange={(event) => setPlatform(event.target.value)}
                  className={inputClass}
                >
                  <option value="Email">
                    Email
                  </option>

                  <option value="Newsletter">
                    Newsletter
                  </option>
                </select>
              </label>

              {/* Sender */}

              <label>
                <span className={labelClass}>
                  From
                </span>

                <input
                  type="email"
                  value={sender}
                  onChange={(event) =>
                    setSender(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="marketing@example.com"
                />
              </label>

              {/* Mail type */}

              <label>
                <span className={labelClass}>
                  Mail type
                </span>

                <select
                  value={mailType}
                  onChange={(event) => {
                    setMailType(
                      event.target
                        .value as MailType,
                    );

                    setError("");
                    setNotice("");
                  }}
                  className={inputClass}
                >
                  <option value="test">
                    Test email
                  </option>

                  <option value="bulk">
                    Send bulk email
                  </option>
                </select>
              </label>
            </div>

            {/* To */}

            <div className="mt-5">
              <label className={labelClass}>
                To
              </label>

              {mailType === "test" ? (
                <input
                  type="email"
                  value={testEmail}
                  onChange={(event) =>
                    setTestEmail(
                      event.target.value,
                    )
                  }
                  className={inputClass}
                  placeholder="one-person@example.com"
                />
              ) : (
                <>
                  <select
                    value={tagId}
                    onChange={(event) =>
                      setTagId(
                        event.target.value,
                      )
                    }
                    className={inputClass}
                  >
                    <option value="">
                      Select a recipient tag
                    </option>

                    {tags.map((tag) => (
                      <option
                        key={tag.id}
                        value={tag.id}
                      >
                        {tag.name}
                      </option>
                    ))}
                  </select>

                  {selectedTag && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-25 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className="font-semibold text-brand-600">
                          {
                            bulkRecipients.length
                          }
                        </span>{" "}
                        {bulkRecipients.length ===
                        1
                          ? "person is"
                          : "people are"}{" "}
                        present in this tag.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setShowRecipients(
                            true,
                          )
                        }
                        disabled={
                          !bulkRecipients.length
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Click to view
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Subject */}

            <label className="mt-5 block">
              <span className={labelClass}>
                Subject
              </span>

              <input
                value={subject}
                onChange={(event) =>
                  setSubject(
                    event.target.value,
                  )
                }
                className={inputClass}
                placeholder="Email subject"
              />
            </label>

            {/* Content */}

            <label className="mt-5 block">
              <span className={labelClass}>
                Content
              </span>

              <textarea
                value={content}
                onChange={(event) =>
                  setContent(
                    event.target.value,
                  )
                }
                className={`${inputClass} min-h-48 resize-y`}
                placeholder="Write your email content..."
              />
            </label>

            <label className="mt-5 block">
              <span className={labelClass}>Schedule send (optional)</span>
              <input
                type="datetime-local"
                min={currentDateTimeLocal()}
                value={scheduledAt}
                onChange={(event) => setScheduledAt(event.target.value)}
                className={inputClass}
              />
              <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                Leave empty to queue the campaign for immediate delivery.
              </span>
            </label>

            {/* Buttons */}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setCampaignName("");
                  setPlatform("Email");
                  setSender("");
                  setTestEmail("");
                  setTagId("");
                  setSubject("");
                  setContent("");
                  setScheduledAt("");
                  setError("");
                  setNotice("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Clear
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700 disabled:cursor-wait disabled:opacity-60"
              >
                {isSaving ? "Saving…" : scheduledAt ? "Schedule email" : "Send email"}
              </button>
            </div>
          </form>

          {/* Preview */}

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
            <h2 className="border-b border-gray-200 pb-5 text-center text-lg font-semibold text-gray-800 dark:border-gray-800 dark:text-white/90">
              Preview
            </h2>

            <div className="mt-5 rounded-xl bg-gray-100 p-5 dark:bg-white/[0.03]">
              <article className="mx-auto min-h-64 max-w-lg bg-white p-7 text-sm text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <h3 className="mb-6 text-center font-semibold">
                  {campaignName ||
                    "Campaign preview"}
                </h3>

                <p className="whitespace-pre-wrap">
                  {content ||
                    "Your email content will appear here."}
                </p>
              </article>
            </div>
          </section>
        </div>
      </div>

      {/* Recipient Modal */}

      {showRecipients && selectedTag && (
        <EmailListModal
          contacts={bulkRecipients}
          tagName={selectedTag.name}
          onClose={() =>
            setShowRecipients(false)
          }
          onToggleContact={
            canUpdateContacts ? toggleEmailOptOut : undefined
          }
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Reusable Components                                                        */
/* -------------------------------------------------------------------------- */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const isTest = status === "Test";

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
        isTest
          ? "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
          : "bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400"
      }`}
    >
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className={labelClass}>{label}</p>

      <p className="text-sm text-gray-700 dark:text-gray-300">
        {value}
      </p>
    </div>
  );
}

function ReportCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-800 dark:bg-white/[0.03]">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}
