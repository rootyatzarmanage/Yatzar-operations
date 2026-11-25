"use client";

import PageMeta from "@/components/common/PageMeta";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/context/AuthContext";
import { request } from "@/api/client";
import { getProfile, updateProfile } from "@/api/profile";
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
  const [profileNotice, setProfileNotice] = useState("");
  const [addressNotice, setAddressNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    let active = true;
    getProfile()
      .then((profile) => {
        if (!active) return;
        const profileName = splitName(profile.name);
        setForm({
          ...profileName,
          email: profile.email,
          mobile: profile.mobile,
          country: profile.country || "India",
          state: profile.state || "Tamil Nadu",
          district: profile.district || "Coimbatore",
          pincode: profile.pincode,
        });
      })
      .catch((error) => {
        if (active) setProfileError(error instanceof Error ? error.message : "Unable to load your profile.");
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    setProfileNotice("");
    setAddressNotice("");
    setProfileError("");
  };

  const persistProfile = async (notice: "profile" | "address") => {
    setProfileSaving(notice === "profile");
    setAddressSaving(notice === "address");
    setProfileError("");
    setProfileNotice("");
    setAddressNotice("");
    try {
      const saved = await updateProfile({
        name: [form.firstName, form.lastName].filter(Boolean).join(" "),
        email: form.email,
        mobile: form.mobile,
        country: form.country,
        state: form.state,
        district: form.district,
        pincode: form.pincode,
      });
      const savedName = splitName(saved.name);
      setForm({
        ...savedName,
        email: saved.email,
        mobile: saved.mobile,
        country: saved.country || "India",
        state: saved.state || "Tamil Nadu",
        district: saved.district || "Coimbatore",
        pincode: saved.pincode,
      });
      if (notice === "profile") setProfileNotice("Profile details saved.");
      else setAddressNotice("Address details saved.");
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "Unable to save your profile.");
    } finally {
      setProfileSaving(false);
      setAddressSaving(false);
    }
  };

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void persistProfile("profile");
  };

  const saveAddress = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void persistProfile("address");
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError("");
    setPasswordNotice("");
    try {
      await request<null>("/profile/change-password", {
        method: "POST",
        body: JSON.stringify(passwordForm),
      });
      setPasswordNotice("Password changed successfully.");
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      setShowPasswordDialog(false);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <>
      <PageMeta title="Profile | Yatzar Operations" description="Manage your Yatzar Operations profile" />
      <PageBreadcrumb pageTitle="Profile" />
      <div className="mx-auto w-full max-w-5xl space-y-3">
        {profileError && <p role="alert" className="text-xs text-red-600">{profileError}</p>}
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
                {displayName || user?.username || "USR-1001"} <span className="mx-1">|</span> {form.email || "Not provided"}
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
          <form onSubmit={saveProfile}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={labelClass}>First Name</span><input value={form.firstName} onChange={(event) => updateField("firstName", event.target.value)} className={inputClass} placeholder="Enter first name" disabled={profileLoading || profileSaving} /></label>
              <label><span className={labelClass}>Last Name</span><input value={form.lastName} onChange={(event) => updateField("lastName", event.target.value)} className={inputClass} placeholder="Enter last name" disabled={profileLoading || profileSaving} /></label>
              <label><span className={labelClass}>E-mail Address</span><input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} className={inputClass} placeholder="name@example.com" disabled={profileLoading || profileSaving} /></label>
              <label>
                <span className={labelClass}>Mobile Number</span>
                <div className="flex gap-2">
                  <select aria-label="Country calling code" className="h-10 w-16 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-700 outline-none dark:border-gray-700 dark:bg-white/5 dark:text-white/90"><option>+91</option></select>
                  <input type="tel" value={form.mobile} onChange={(event) => updateField("mobile", event.target.value)} className={inputClass} placeholder="Enter mobile number" disabled={profileLoading || profileSaving} />
                </div>
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              {profileNotice && <span className="text-xs text-green-600">{profileNotice}</span>}
              <button type="submit" disabled={profileLoading || profileSaving || addressSaving} className="rounded-lg bg-[#465fff] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{profileSaving ? "Saving..." : " Save"}</button>
            </div>
          </form>
        </section>

        <section className={cardClass}>
          <div className="mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Address</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">This address appears on your invoices and account records.</p>
          </div>
          <form onSubmit={saveAddress}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className={labelClass}>Country</span><select value={form.country} onChange={(event) => updateField("country", event.target.value)} className={inputClass} disabled={profileLoading || addressSaving}><option>India</option><option>United States</option><option>United Kingdom</option></select></label>
              <label><span className={labelClass}>State</span><select value={form.state} onChange={(event) => updateField("state", event.target.value)} className={inputClass} disabled={profileLoading || addressSaving}><option>Tamil Nadu</option><option>Karnataka</option><option>Kerala</option></select></label>
              <label><span className={labelClass}>District</span><select value={form.district} onChange={(event) => updateField("district", event.target.value)} className={inputClass} disabled={profileLoading || addressSaving}><option>Coimbatore</option><option>Chennai</option><option>Madurai</option></select></label>
              <label><span className={labelClass}>Pin code</span><input value={form.pincode} onChange={(event) => updateField("pincode", event.target.value)} className={inputClass} placeholder="e.g. 641006" disabled={profileLoading || addressSaving} /></label>
            </div>
            <div className="mt-4 flex justify-end gap-3">{addressNotice && <span className="text-xs text-green-600">{addressNotice}</span>}<button type="submit" disabled={profileLoading || profileSaving || addressSaving} className="rounded-lg bg-[#465fff] px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{addressSaving ? "Saving..." : " Save"}</button></div>
          </form>
        </section>

        <section className={cardClass}>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Security</h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Manage how you sign in and keep your account secure.</p>
          </div>
          <div className="flex items-center justify-between border-b border-gray-100 py-3 dark:border-gray-800">
            <div><p className="text-xs font-medium text-gray-800 dark:text-gray-200">Change Password</p><p className="text-xs text-gray-500 dark:text-gray-400">Update your account password.</p></div>
            <button type="button" onClick={() => { setPasswordError(""); setPasswordNotice(""); setShowPasswordDialog(true); }} className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Change Password</button>
          </div>
          {passwordNotice && <p role="status" className="pt-3 text-xs text-green-600">{passwordNotice}</p>}
        </section>
      </div>
      {showPasswordDialog && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !passwordSaving) setShowPasswordDialog(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="change-password-title" className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <h2 id="change-password-title" className="mb-4 text-base font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <form onSubmit={changePassword} className="space-y-3">
            <label className="block"><span className={labelClass}>Current password</span><input type="password" autoComplete="current-password" required maxLength={128} value={passwordForm.current_password} onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>New password</span><input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={passwordForm.new_password} onChange={(event) => setPasswordForm((current) => ({ ...current, new_password: event.target.value }))} className={inputClass} /></label>
            <label className="block"><span className={labelClass}>Confirm new password</span><input type="password" autoComplete="new-password" required maxLength={128} value={passwordForm.confirm_password} onChange={(event) => setPasswordForm((current) => ({ ...current, confirm_password: event.target.value }))} className={inputClass} /></label>
            {passwordError && <p role="alert" className="text-xs text-red-600">{passwordError}</p>}
            <div className="flex justify-end gap-2 pt-1"><button type="button" disabled={passwordSaving} onClick={() => setShowPasswordDialog(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Cancel</button><button type="submit" disabled={passwordSaving} className="rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">{passwordSaving ? "Saving..." : "Change Password"}</button></div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
