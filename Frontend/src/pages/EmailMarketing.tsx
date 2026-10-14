import {
  listContactStage,
  updateContact,
  type Contact,
} from "@/api/contacts";
import { listTags, type Tag } from "@/api/tags";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { Eye, Mail, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type MailType = "test" | "bulk";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-brand-300 focus:bg-white focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-white/3 dark:text-white/90";
const labelClass =
  "mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300";

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
  const totalPages = Math.max(1, Math.ceil(contacts.length / perPage));
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
        if (event.target === event.currentTarget) onClose();
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
            <h2 id="email-list-title" className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Send E-mail List
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {contacts.length} {contacts.length === 1 ? "person" : "people"} in {tagName}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close recipient list" className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">
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
              {[10, 25, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            entries per page
          </label>

          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-white/3">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500">Email</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visibleContacts.map((contact, index) => (
                  <tr key={contact.id}>
                    <td className="px-4 py-3 text-sm text-gray-500">{(currentPage - 1) * perPage + index + 1}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{contact.email}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={updatingId === contact.id}
                        onClick={() => {
                          setUpdatingId(contact.id);
                          void onToggleContact(contact).finally(() => setUpdatingId(null));
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
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-gray-500">
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
            Showing {contacts.length ? (currentPage - 1) * perPage + 1 : 0} to {Math.min(currentPage * perPage, contacts.length)} of {contacts.length}
          </span>
          <div className="flex gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300">Previous</button>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-40 dark:border-gray-800 dark:text-gray-300">Next</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export default function EmailMarketing() {
  const [mailType, setMailType] = useState<MailType>("test");
  const [campaignName, setCampaignName] = useState("");
  const [sender, setSender] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [tagId, setTagId] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showRecipients, setShowRecipients] = useState(false);

  useEffect(() => {
    void Promise.all([listTags(), listContactStage("contact")])
      .then(([loadedTags, loadedContacts]) => {
        setTags(loadedTags);
        setContacts(loadedContacts.filter((contact) => Boolean(contact.email)));
      })
      .catch((requestError: unknown) => {
        setError(requestError instanceof Error ? requestError.message : "Unable to load tags and contacts.");
      });
  }, []);

  const selectedTag = tags.find((tag) => tag.id === tagId);
  const bulkRecipients = useMemo(
    () => contacts.filter((contact) => contact.tag_id === tagId),
    [contacts, tagId],
  );

  async function toggleEmailOptOut(contact: Contact) {
    try {
      const updatedContact = await updateContact(contact.id, {
        email_opt_out: !contact.email_opt_out,
      });
      setContacts((current) =>
        current.map((item) => item.id === updatedContact.id ? updatedContact : item),
      );
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update email status.");
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!campaignName.trim() || !sender.trim() || !subject.trim() || !content.trim()) {
      setError("Campaign name, sender, subject, and content are required.");
      return;
    }
    if (mailType === "test") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail.trim())) {
        setError("Enter one valid test email address.");
        return;
      }
      setNotice(`Test email is ready to send to ${testEmail.trim()}.`);
      return;
    }
    if (!selectedTag) {
      setError("Select a tag for the bulk email.");
      return;
    }
    setNotice(`Bulk email is ready to send to ${bulkRecipients.length} ${bulkRecipients.length === 1 ? "person" : "people"}.`);
  }

  return (
    <>
      <PageMeta title="Email marketing | Yatzar Operations" description="Create and send email marketing campaigns." />
      <PageBreadcrumb pageTitle="Email marketing" parent={{ label: "Marketing" }} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
          <div className="mb-6 flex items-center gap-3 border-b border-gray-200 pb-5 dark:border-gray-800">
            <span className="rounded-xl bg-brand-50 p-3 text-brand-500 dark:bg-brand-500/15"><Mail size={20} /></span>
            <div><h1 className="text-lg font-semibold text-gray-800 dark:text-white/90">New campaign</h1><p className="text-sm text-gray-500 dark:text-gray-400">Send a test or bulk email to your contacts.</p></div>
          </div>
          {error && <div role="alert" className="mb-5 rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>}
          {notice && <div role="status" className="mb-5 rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-700">{notice}</div>}
          <div className="grid gap-5 sm:grid-cols-2">
            <label><span className={labelClass}>Campaign name</span><input value={campaignName} onChange={(event) => setCampaignName(event.target.value)} className={inputClass} placeholder="Spring campaign" /></label>
            <label><span className={labelClass}>Platform</span><select className={inputClass}><option>Email</option><option>Newsletter</option></select></label>
            <label><span className={labelClass}>From</span><input type="email" value={sender} onChange={(event) => setSender(event.target.value)} className={inputClass} placeholder="marketing@example.com" /></label>
            <label><span className={labelClass}>Mail type</span><select value={mailType} onChange={(event) => { setMailType(event.target.value as MailType); setError(""); setNotice(""); }} className={inputClass}><option value="test">Test email</option><option value="bulk">Send bulk email</option></select></label>
          </div>
          <div className="mt-5">
            <label className={labelClass}>To</label>
            {mailType === "test" ? (
              <input type="email" value={testEmail} onChange={(event) => setTestEmail(event.target.value)} className={inputClass} placeholder="one-person@example.com" />
            ) : (
              <>
                <select value={tagId} onChange={(event) => setTagId(event.target.value)} className={inputClass}>
                  <option value="">Select a recipient tag</option>
                  {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
                </select>
                {selectedTag && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-25 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300"><span className="font-semibold text-brand-600">{bulkRecipients.length}</span> {bulkRecipients.length === 1 ? "person is" : "people are"} present in this tag.</p>
                    <button type="button" onClick={() => setShowRecipients(true)} disabled={!bulkRecipients.length} className="inline-flex items-center gap-2 rounded-lg bg-success-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">Click to view</button>
                  </div>
                )}
              </>
            )}
          </div>
          <label className="mt-5 block"><span className={labelClass}>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass} /></label>
          <label className="mt-5 block"><span className={labelClass}>Content</span><textarea value={content} onChange={(event) => setContent(event.target.value)} className={`${inputClass} min-h-48 resize-y`} /></label>
          <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => { setCampaignName(""); setSender(""); setTestEmail(""); setTagId(""); setSubject(""); setContent(""); }} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-800">Clear</button><button type="submit" className="rounded-lg bg-success-600 px-4 py-2.5 text-sm font-semibold text-white">Send email</button></div>
        </form>
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark"><h2 className="border-b border-gray-200 pb-5 text-center text-lg font-semibold dark:border-gray-800">Preview</h2><div className="mt-5 rounded-xl bg-gray-100 p-5"><article className="mx-auto min-h-64 max-w-lg bg-white p-7 text-sm text-gray-600"><h3 className="mb-6 text-center font-semibold">{campaignName || "Campaign preview"}</h3><p className="whitespace-pre-wrap">{content || "Your email content will appear here."}</p></article></div></section>
      </div>
      {showRecipients && selectedTag && <EmailListModal contacts={bulkRecipients} tagName={selectedTag.name} onClose={() => setShowRecipients(false)} onToggleContact={toggleEmailOptOut} />}
    </>
  );
}
