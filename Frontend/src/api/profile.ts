import { request } from "@/api/client";

export type UserProfile = {
  name: string;
  email: string;
  mobile: string;
  country: string;
  state: string;
  district: string;
  pincode: string;
};

export function getProfile() {
  return request<UserProfile>("/profile");
}

export function updateProfile(profile: UserProfile) {
  return request<UserProfile>("/profile", {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}
