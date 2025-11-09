import axios, { AxiosError } from "axios";
import { getApiBaseUrl } from "../config/env";

export interface ApiError {
  success?: boolean;
  message?: string;
  error?: string;
  errors?: unknown;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

const extractErrorPayload = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    return axiosError.response?.data ?? { message: axiosError.message };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "Unexpected error" };
};

export const tokenService = {
  async mintToken<T>(data: T) {
    try {
      const response = await api.post("/mint-token", data);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },

  async transferTokens<T>(data: T) {
    try {
      const response = await api.post("/transfer-tokens", data);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },

  async getBalance(publicKey: string) {
    try {
      const response = await api.get(`/balance/${publicKey}`);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },

  async burnToken<T>(data: T) {
    try {
      const response = await api.post("/burn-token", data);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },

  async delegateToken<T>(data: T) {
    try {
      const response = await api.post("/delegate-token", data);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },

  async closeTokenAccount<T>(data: T) {
    try {
      const response = await api.post("/close-token-account", data);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },

  async requestAirdrop(publicKey: string) {
    try {
      const response = await api.post(`/airdrop/${publicKey}`);
      return response.data;
    } catch (error) {
      throw extractErrorPayload(error);
    }
  },
};

export { api, extractErrorPayload };
