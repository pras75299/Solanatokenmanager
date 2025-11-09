import MockAdapter from "axios-mock-adapter";
import { api, tokenService } from "./api";

describe("tokenService", () => {
  const mock = new MockAdapter(api);

  afterEach(() => {
    mock.reset();
  });

  afterAll(() => {
    mock.restore();
  });

  it("returns API response data for successful calls", async () => {
    const payload = { recipientPublicKey: "wallet" };
    const responseBody = { success: true, message: "ok" };

    mock.onPost("/mint-token", payload).reply(200, responseBody);

    await expect(tokenService.mintToken(payload)).resolves.toEqual(responseBody);
  });

  it("throws structured payload for error responses", async () => {
    const payload = { recipientPublicKey: "wallet" };
    const errorBody = { success: false, message: "Invalid" };

    mock.onPost("/mint-token", payload).reply(400, errorBody);

    await expect(tokenService.mintToken(payload)).rejects.toEqual(errorBody);
  });

  it("supports airdrop requests via dedicated endpoint", async () => {
    const publicKey = "testPubKey";
    const responseBody = { success: true, message: "Airdrop requested" };

    mock.onPost(`/airdrop/${publicKey}`).reply(200, responseBody);

    await expect(tokenService.requestAirdrop(publicKey)).resolves.toEqual(
      responseBody
    );
  });
});
