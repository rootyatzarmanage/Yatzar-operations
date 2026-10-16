const BASE = "https://countriesnow.space/api/v0.1/countries";

async function request(path: string, body?: object) {
  const res = await fetch(`${BASE}${path}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return json.error ? null : json.data;
}

export async function listCountries(): Promise<string[]> {
  const data = await request("/codes");
  return (data ?? []).map((c: { name: string }) => c.name).sort();
}

export async function listStates(country: string): Promise<string[]> {
  const data = await request("/states", { country });
  return (data?.states ?? []).map((s: { name: string }) => s.name).sort();
}

export async function listDistricts(country: string, state: string): Promise<string[]> {
  const data = await request("/state/cities", { country, state });
  return [...(data ?? [])].sort();
}