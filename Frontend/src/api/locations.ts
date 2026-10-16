import { request } from "@/api/client";

export function listCountries() {
  return request<string[]>("/support/locations/countries");
}

export function listStates(country: string) {
  return request<string[]>(
    `/support/locations/states?country=${encodeURIComponent(country)}`,
  );
}

export function listDistricts(state: string) {
  return request<string[]>(
    `/support/locations/districts?state=${encodeURIComponent(state)}`,
  );
}
