jest.mock("../services/solanaService", () => {
  const actual = jest.requireActual("../services/solanaService");
  return {
    ...actual,
    mintToken: jest.fn().mockResolvedValue("Mock mint success"),
    mintToken2022: jest.fn().mockResolvedValue("Mock mint 2022 success"),
    transferTokens: jest.fn().mockResolvedValue("Mock transfer success"),
    burnToken: jest.fn().mockResolvedValue("Mock burn success"),
    delegateToken: jest.fn().mockResolvedValue("Mock delegate success"),
    closeTokenAccount: jest.fn().mockResolvedValue("Mock close success"),
    getBalance: jest.fn().mockResolvedValue(42),
    airdropSol: jest.fn().mockResolvedValue("Mock airdrop success"),
  };
});

const request = require("supertest");
const { createApp } = require("../app");
const solanaService = require("../services/solanaService");

const VALID_PUBLIC_KEY = "4Nd1mW2JxYNrP4QW7w3fGH5pK9mHF4RS8Pf63HgFNDNm";

describe("Token routes", () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createApp();
  });

  test("POST /api/mint-token rejects invalid payload", async () => {
    const response = await request(app).post("/api/mint-token").send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(solanaService.mintToken).not.toHaveBeenCalled();
  });

  test("POST /api/mint-token routes token-2022 requests to the dedicated service", async () => {
    const response = await request(app)
      .post("/api/mint-token")
      .send({
        recipientPublicKey: VALID_PUBLIC_KEY,
        tokenStandard: "Token-2022",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(solanaService.mintToken2022).toHaveBeenCalledTimes(1);
    expect(solanaService.mintToken2022).toHaveBeenCalledWith(VALID_PUBLIC_KEY);
    expect(solanaService.mintToken).not.toHaveBeenCalled();
  });

  test("POST /api/transfer-tokens rejects non-positive amounts", async () => {
    const response = await request(app)
      .post("/api/transfer-tokens")
      .send({
        mintAddress: VALID_PUBLIC_KEY,
        toWallet: VALID_PUBLIC_KEY,
        amount: "-1",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(solanaService.transferTokens).not.toHaveBeenCalled();
  });

  test("POST /api/transfer-tokens forwards validated payload to the service layer", async () => {
    const response = await request(app)
      .post("/api/transfer-tokens")
      .send({
        mintAddress: VALID_PUBLIC_KEY,
        toWallet: VALID_PUBLIC_KEY,
        amount: "2.5",
        tokenStandard: "Token",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(solanaService.transferTokens).toHaveBeenCalledWith(
      VALID_PUBLIC_KEY,
      expect.objectContaining({ publicKey: expect.any(Object) }),
      VALID_PUBLIC_KEY,
      "2.5",
      "Token"
    );
  });

  test("GET /api/balance/:publicKey returns validation errors for malformed keys", async () => {
    const response = await request(app).get("/api/balance/not-a-key");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(solanaService.getBalance).not.toHaveBeenCalled();
  });

  test("GET /api/balance/:publicKey delegates to service and returns balance", async () => {
    const response = await request(app).get(`/api/balance/${VALID_PUBLIC_KEY}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.balance).toBe(42);
    expect(solanaService.getBalance).toHaveBeenCalledWith(VALID_PUBLIC_KEY);
  });

  test("POST /api/airdrop/:publicKey validates input", async () => {
    const response = await request(app).post("/api/airdrop/not-a-key");

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(solanaService.airdropSol).not.toHaveBeenCalled();
  });

  test("POST /api/airdrop/:publicKey returns service response", async () => {
    const response = await request(app).post(`/api/airdrop/${VALID_PUBLIC_KEY}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Mock airdrop success");
    expect(solanaService.airdropSol).toHaveBeenCalledWith(VALID_PUBLIC_KEY);
  });
});
