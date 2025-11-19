import axios, { AxiosError } from "axios";
import { getApiBaseUrl } from "../config/env";

export interface ApiError {
  success?: boolean;
  message?: string;
  error?: string;
  errors?: unknown;
  details?: {
    required?: string;
    available?: string;
  };
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
});

// Add request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(
          `[API] Response error ${error.response.status} from ${error.config?.url}:`,
          error.response.data
        );
      } else if (error.request) {
        console.error(
          `[API] No response received for ${error.config?.url}:`,
          error.message
        );
      } else {
        console.error("[API] Request setup error:", error.message);
      }
    }
    return Promise.reject(error);
  }
);

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
      const errorPayload = extractErrorPayload(error);
      console.error("[API] Airdrop error:", errorPayload);
      
      // Handle network errors specifically
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Network error - no response from server
          const baseURL = getApiBaseUrl();
          const fullURL = `${baseURL}/airdrop/${publicKey}`;
          console.error(`[API] Network error - attempted URL: ${fullURL}`);
          throw {
            message: `Network Error: Unable to reach server at ${baseURL}. Please check if the backend is running on the correct port.`,
            error: "Network Error",
            attemptedUrl: fullURL,
          };
        }
      }
      
      throw errorPayload;
    }
  },

  async checkHealth() {
    try {
      const response = await api.get("/health");
      return response.data;
    } catch (error) {
      const baseURL = getApiBaseUrl();
      console.error(`[API] Health check failed for ${baseURL}:`, error);
      
      // Provide more detailed error information
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          // Network error - server not reachable
          throw {
            message: `Backend server is not reachable at ${baseURL}. Please ensure the backend is running on the correct port.`,
            error: "Connection Error",
            baseURL,
            suggestion: "Check if the backend server is running: cd backend && npm start",
          };
        }
      }
      
      throw {
        message: `Backend server is not reachable at ${baseURL}. Please ensure the backend is running.`,
        error: "Connection Error",
        baseURL,
      };
    }
  },
};

export { api, extractErrorPayload };
