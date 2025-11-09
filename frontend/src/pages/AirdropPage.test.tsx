import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Mock } from "vitest";
import AirdropPage from "./AirdropPage";
import toast from "react-hot-toast";
import { tokenService } from "../lib/api";
import { useWallet } from "@solana/wallet-adapter-react";

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  tokenService: {
    requestAirdrop: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockedUseWallet = useWallet as unknown as Mock;
const mockedRequestAirdrop = tokenService.requestAirdrop as unknown as Mock;
const toastMock = toast as unknown as { success: Mock; error: Mock };

describe("AirdropPage", () => {
  beforeEach(() => {
    mockedUseWallet.mockReset();
    mockedRequestAirdrop.mockReset();
    toastMock.success.mockReset();
    toastMock.error.mockReset();
  });

  it("prompts user to connect wallet when disconnected", () => {
    mockedUseWallet.mockReturnValue({ connected: false, publicKey: null });

    render(<AirdropPage />);

    expect(
      screen.getByText(/Please connect your wallet to request an airdrop/i)
    ).toBeInTheDocument();
  });

  it("requests an airdrop when user clicks the button", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      publicKey: { toString: () => "wallet" },
    });

    mockedRequestAirdrop.mockResolvedValue({ message: "Done" });

    render(<AirdropPage />);

    const button = screen.getByRole("button", { name: /airdrop 2 sol/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedRequestAirdrop).toHaveBeenCalledWith("wallet");
    });
    expect(toastMock.success).toHaveBeenCalledWith("Done");
  });

  it("surfaces errors via toast when airdrop fails", async () => {
    mockedUseWallet.mockReturnValue({
      connected: true,
      publicKey: { toString: () => "wallet" },
    });

    mockedRequestAirdrop.mockRejectedValue({ message: "Network down" });

    render(<AirdropPage />);

    fireEvent.click(screen.getByRole("button", { name: /airdrop 2 sol/i }));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith(
        expect.stringContaining("Network down")
      );
    });
  });
});
