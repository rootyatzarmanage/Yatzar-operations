"use client";

import PageMeta from "@/components/common/PageMeta";
import SearchableSelect from "@/components/common/SearchableSelect";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  country: string;
  state: string;
  district: string;
  pincode: string;
};

const inputClass =
  "h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 outline-none transition placeholder:text-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-white/5 dark:text-white/90";
const labelClass =
  "mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300";
const cardClass =
  "rounded-lg border border-gray-200 bg-white p-4 shadow-theme-xs sm:p-5 dark:border-gray-800 dark:bg-gray-900";

function splitName(name: string | null | undefined) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}

export default function Profile() {
  const { user } = useAuth();
  const name = user?.display_name || user?.employee_name || user?.username || "";
  const initialName = useMemo(() => splitName(name), [name]);
  const [form, setForm] = useState<ProfileForm>({
    ...initialName,
    email: user?.email ?? "",
    mobile: "",
    country: "India",
    state: "Tamil Nadu",
    district: "Coimbatore",
    pincode: "",
  });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setForm((current) => ({ ...current, ...initialName, email: user?.email ?? "" }));
  }, [initialName, user?.email]);

  const displayName =
    [form.firstName, form.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Your Name";
  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const updateField = (field: keyof ProfileForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice("");
  };
  const saveSection = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("Profile details saved.");
  };

  return (
    <>
      <PageMeta title="Profile | Yatzar Operations" description="Manage your Yatzar Operations profile" />
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <section className={cardClass}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 text-3xl font-semibold text-gray-500 dark:border-gray-700 dark:bg-white/5 dark:text-gray-300">
                {user?.photo ? <img src={user.photo} alt={`${displayName} profile`} className="h-full w-full object-cover" /> : initials || "U"}
              </div>
              <button type="button" className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300" aria-label="Edit profile photo">
                Edit ✎
              </button>
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">{displayName}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.employee_name || user?.username || "USR-1001"} <span className="mx-1">|</span> {user?.email || "Not provided"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{form.mobile || "+91"}</p>
            </div>
            <p className="self-end text-xs text-gray-600 sm:self-center dark:text-gray-400">{form.state}, {form.country}</p>
          </div>
        </section>

        <section className={cardClass}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Profile</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Your Basic Account Information.</p>
          </div>
          <form onSubmit={saveSection}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={labelClass}>First Name</span><input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={inputClass} placeholder="Enter first name" /></label>
              <label><span className={labelClass}>Last Name</span><input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={inputClass} placeholder="Enter last name" /></label>
              <label><span className={labelClass}>E-mail Address</span><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass} placeholder="name@example.com" /></label>
              <label>
                <span className={labelClass}>Mobile Number</span>
                <div className="flex gap-2">
                  <SearchableSelect
                    size="sm"
                    aria-label="Country calling code"
                    className="h-10 w-24"
                    value="+91"
                    options={["+91", "+1", "+44", "+61", "+971"]}
                  />
                  <input type="tel" value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} className={inputClass} placeholder="Enter mobile number" />
                </div>
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              {notice && <span className="text-xs text-green-600">{notice}</span>}
              <button type="submit" className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500">▣&nbsp; Save</button>
            </div>
          </form>
        </section>

        <section className={cardClass}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Address</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This address appears on your invoices and account records.</p>
          </div>
          <form onSubmit={saveSection}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={labelClass}>Country</span><SearchableSelect value={form.country} onChange={(val) => updateField("country", val)} options={["India", "United States", "United Kingdom"]} className={inputClass} /></label>
              <label><span className={labelClass}>State</span><SearchableSelect value={form.state} onChange={(val) => updateField("state", val)} options={["Tamil Nadu", "Karnataka", "Kerala", "Maharashtra", "Delhi"]} className={inputClass} /></label>
              <label><span className={labelClass}>District</span><SearchableSelect value={form.district} onChange={(val) => updateField("district", val)} options={["Coimbatore", "Chennai", "Madurai", "Bengaluru", "Kochi"]} className={inputClass} /></label>
              <label><span className={labelClass}>Pin code</span><input value={form.pincode} onChange={(event) => updateField("pincode", event.target.value)} className={inputClass} placeholder="e.g. 641006" /></label>
            </div>
            <div className="mt-4 flex justify-end"><button type="submit" className="rounded-lg bg-sky-400 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500">▣&nbsp; Save</button></div>
          </form>
        </section>

        <section className={cardClass}>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Manage how you sign in and keep your account secure.</p>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800">
            <div><p className="text-xs font-medium text-gray-800 dark:text-gray-200">Change Password</p><p className="text-xs text-gray-500 dark:text-gray-400">Last changed Jun 2025</p></div>
            <button type="button" className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Change Password</button>
          </div>
          <div className="flex items-center justify-between pt-3">
            <div><p className="text-xs font-medium text-gray-800 dark:text-gray-200">Two-Factor Authentication</p><p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security at sign-in.</p></div>
            <button type="button" role="switch" aria-checked="false" aria-label="Enable two-factor authentication" className="relative h-6 w-10 rounded-full bg-gray-200 p-1 dark:bg-gray-700"><span className="block h-4 w-4 rounded-full bg-white shadow-sm" /></button>
          </div>
        </section>
      </div>
    </>
  );
}