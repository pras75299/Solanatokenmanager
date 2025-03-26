import axios from "axios";

const API_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const tokenService = {
  mintToken: async (data) => {
    try {
      const response = await api.post("/mint-token", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  transferTokens: async (data) => {
    try {
      const response = await api.post("/transfer-tokens", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  getBalance: async (publicKey) => {
    try {
      const response = await api.get(`/balance/${publicKey}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  burnToken: async (data) => {
    try {
      const response = await api.post("/burn-token", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  delegateToken: async (data) => {
    try {
      const response = await api.post("/delegate-token", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  closeTokenAccount: async (data) => {
    try {
      const response = await api.post("/close-token-account", data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },
};

export default api;
