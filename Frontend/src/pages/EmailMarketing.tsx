import {
  listContactStage,
  updateContact,
  type Contact,
} from "@/api/contacts";
import { listTags, type Tag } from "@/api/tags";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import {
  Eye,
  Mail,
  X,
  Plus,
  Search,
  Trash2,
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
  id: number;
  campaignName: string;
  subject: string;
  status: string;
  sendTo: number;
  opens: number;
  clicks: number;
  lastEdited: string;
  sender: string;
  content: string;
  mailType: MailType;
  testEmail: string;
  tagId: string;
};

type EmailCampaignForm = {
  campaignName: string;
  sender: string;
  testEmail: string;
  tagId: string;
  subject: string;
  content: string;
  mailType: MailType;
};

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
  onToggleContact: (contact: Contact) => Promise<void>;
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

                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">
                    Action
                  </th>
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

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={updatingId === contact.id}
                        onClick={() => {
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
                    </td>
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
}: {
  campaign: EmailCampaign;
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
            value={campaign.campaignName}
          />

          <DetailRow
            label="Subject"
            value={campaign.subject}
          />

          <DetailRow
            label="Sender"
            value={campaign.sender}
          />

          <DetailRow
            label="Mail type"
            value={
              campaign.mailType === "test"
                ? "Test email"
                : "Send bulk email"
            }
          />

          <DetailRow
            label="Send to"
            value={String(campaign.sendTo)}
          />

          <DetailRow
            label="Status"
            value={campaign.status}
          />

          <div>
            <p className={labelClass}>Content</p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm whitespace-pre-wrap text-gray-700 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300">
              {campaign.content}
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
  onClose,
}: {
  campaign: EmailCampaign;
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
            value={campaign.sendTo}
          />

          <ReportCard
            label="Opens"
            value={campaign.opens}
          />

          <ReportCard
            label="Clicks"
            value={campaign.clicks}
          />
        </div>

        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Last edited
          </p>

          <p className="mt-1 text-sm font-medium text-gray-800 dark:text-white/90">
            {campaign.lastEdited}
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
  const [showNewCampaign, setShowNewCampaign] =
    useState(false);

  const [campaigns, setCampaigns] =
    useState<EmailCampaign[]>([]);

  const [search, setSearch] = useState("");

  const [selectedCampaign, setSelectedCampaign] =
    useState<EmailCampaign | null>(null);

  const [showViewModal, setShowViewModal] =
    useState(false);

  const [showReportModal, setShowReportModal] =
    useState(false);

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

  const handleAddCampaign = (
    form: EmailCampaignForm,
    sendTo: number,
  ) => {
    const newCampaign: EmailCampaign = {
      id: Date.now(),
      campaignName: form.campaignName,
      subject: form.subject,
      status:
        form.mailType === "test"
          ? "Test"
          : "Email Sent",
      sendTo,
      opens: 0,
      clicks: 0,
      lastEdited: new Date().toLocaleString(),
      sender: form.sender,
      content: form.content,
      mailType: form.mailType,
      testEmail: form.testEmail,
      tagId: form.tagId,
    };

    setCampaigns((previous) => [
      ...previous,
      newCampaign,
    ]);

    setReplicateCampaign(null);
    setShowNewCampaign(false);
  };

  /* ---------------------------------------------------------------------- */
  /* View                                                                   */
  /* ---------------------------------------------------------------------- */

  const handleViewCampaign = (
    campaign: EmailCampaign,
  ) => {
    setSelectedCampaign(campaign);
    setShowViewModal(true);
  };

  /* ---------------------------------------------------------------------- */
  /* Report                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleReportCampaign = (
    campaign: EmailCampaign,
  ) => {
    setSelectedCampaign(campaign);
    setShowReportModal(true);
  };

  /* ---------------------------------------------------------------------- */
  /* Replicate                                                              */
  /* ---------------------------------------------------------------------- */

  const handleReplicateCampaign = (
    campaign: EmailCampaign,
  ) => {
    setReplicateCampaign(campaign);
    setShowNewCampaign(true);
  };

  /* ---------------------------------------------------------------------- */
  /* Delete                                                                 */
  /* ---------------------------------------------------------------------- */

  const handleDeleteCampaign = (
    id: number,
  ) => {
    setCampaigns((previous) =>
      previous.filter(
        (campaign) => campaign.id !== id,
      ),
    );
  };

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

            <button
              type="button"
              onClick={() => {
                setReplicateCampaign(null);
                setShowNewCampaign(true);
              }}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition hover:bg-brand-600"
            >
              <Plus size={16} />
              New campaign
            </button>
          </div>

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
                  <TableHeader>SEND TO</TableHeader>
                  <TableHeader>ANALYTICS</TableHeader>
                  <TableHeader>LAST EDITED</TableHeader>
                  <TableHeader>ACTIONS</TableHeader>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredCampaigns.map(
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

                          <button
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
                          </button>

                          {/* DELETE */}

                          <button
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
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* Empty State */}

          {filteredCampaigns.length === 0 && (
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
}: {
  initialCampaign: EmailCampaign | null;
  onCancel: () => void;
  onSave: (
    form: EmailCampaignForm,
    sendTo: number,
  ) => void;
}) {
  const [mailType, setMailType] =
    useState<MailType>(
      initialCampaign?.mailType ?? "test",
    );

  const [campaignName, setCampaignName] =
    useState(
      initialCampaign?.campaignName ?? "",
    );

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

  const [tags, setTags] = useState<Tag[]>([]);
  const [contacts, setContacts] =
    useState<Contact[]>([]);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [showRecipients, setShowRecipients] =
    useState(false);

  useEffect(() => {
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
  }, []);

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

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setNotice("");

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

      onSave(
        {
          campaignName:
            campaignName.trim(),
          sender: sender.trim(),
          testEmail:
            testEmail.trim(),
          tagId: "",
          subject: subject.trim(),
          content: content.trim(),
          mailType,
        },
        1,
      );

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

    onSave(
      {
        campaignName:
          campaignName.trim(),
        sender: sender.trim(),
        testEmail: "",
        tagId,
        subject: subject.trim(),
        content: content.trim(),
        mailType,
      },
      bulkRecipients.length,
    );
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
                  setSender("");
                  setTestEmail("");
                  setTagId("");
                  setSubject("");
                  setContent("");
                  setError("");
                  setNotice("");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
              >
                Clear
              </button>

              <button
                type="submit"
                className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-success-700"
              >
                Send email
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
            toggleEmailOptOut
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