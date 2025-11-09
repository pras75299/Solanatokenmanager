const DEFAULT_API_BASE_URL = "http://localhost:5000/api";

export const getApiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;
  if (typeof baseUrl !== "string" || baseUrl.trim().length === 0) {
    return DEFAULT_API_BASE_URL;
  }

  return baseUrl.replace(/\/$/, "");
};
