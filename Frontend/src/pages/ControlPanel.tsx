import { useEffect, useState, type FormEvent } from "react";
import { Plus, X } from "lucide-react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import { getEmailNotificationSettings, saveEmailNotificationSettings } from "@/api/controlPanel";

type AddressGroupProps = {
  title: string;
  description: string;
  value: string[];
  onChange: (value: string[]) => void;
};

function AddressGroup({ title, description, value, onChange }: AddressGroupProps) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const address = draft.trim().toLowerCase();
    if (address && !value.includes(address)) onChange([...value, address]);
    setDraft("");
  };
  return (
    <section className="rounded-xl border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event: FormEvent) => { event.preventDefault(); add(); }}>
        <input type="email" value={draft} onChange={(event) => setDraft(event.target.value)} className="h-11 min-w-0 flex-1 rounded-lg border border-gray-200 bg-transparent px-3 text-sm text-gray-800 dark:border-gray-800 dark:text-white/90" placeholder="name@example.com" />
        <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600"><Plus size={16} /> Add</button>
      </form>
      <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
        {value.length === 0 && <li className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">No email addresses added.</li>}
        {value.map((address) => <li key={address} className="flex items-center justify-between gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300"><span>{address}</span><button type="button" onClick={() => onChange(value.filter((item) => item !== address))} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-error-500 dark:hover:bg-white/5" aria-label={`Remove ${address}`}><X size={16} /></button></li>)}
      </ul>
    </section>
  );
}

export default function ControlPanel() {
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    getEmailNotificationSettings().then((settings) => {
      setToEmails(settings.to_emails);
      setCcEmails(settings.cc_emails);
    }).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to load settings.")).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const settings = await saveEmailNotificationSettings({ to_emails: toEmails, cc_emails: ccEmails });
      setToEmails(settings.to_emails); setCcEmails(settings.cc_emails); setSuccess("Email notification recipients saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save settings.");
    } finally { setSaving(false); }
  };

  return <>
    <PageMeta title="Control Panel | Yatzar Operations" description="Configure email marketing delivery notifications" />
    <PageBreadcrumb pageTitle="Control Panel" />
    <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-theme-sm dark:border-gray-800 dark:bg-gray-dark">
      <header className="border-b border-gray-200 p-5 dark:border-gray-800"><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Admin notification receive email</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Receive a delivery summary when a scheduled or bulk email marketing campaign finishes.</p></header>
      <div className="space-y-5 p-5">
        {error && <p role="alert" className="rounded-lg border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-600">{error}</p>}
        {success && <p role="status" className="rounded-lg border border-success-200 bg-success-50 px-4 py-3 text-sm text-success-600">{success}</p>}
        {loading ? <p className="text-sm text-gray-500">Loading settings…</p> : <>
          <AddressGroup title="To" description="Add one or more administrators who receive campaign summaries." value={toEmails} onChange={setToEmails} />
          <AddressGroup title="Cc" description="Optionally copy additional recipients on each campaign summary." value={ccEmails} onChange={setCcEmails} />
          <div className="flex justify-end"><button type="button" disabled={saving} onClick={() => void save()} className="h-11 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button></div>
        </>}
      </div>
    </section>
  </>;
}
