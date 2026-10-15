import { request } from "@/api/client";

export function listCountries() {
  return request<string[]>("/locations/countries");
}

export function listStates(country: string) {
  return request<string[]>(
    `/locations/states?country=${encodeURIComponent(country)}`,
  );
}

export function listDistricts(state: string) {
  return request<string[]>(
    `/locations/districts?state=${encodeURIComponent(state)}`,
  );
}
