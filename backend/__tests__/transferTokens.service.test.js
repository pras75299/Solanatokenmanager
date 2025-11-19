const dummyPrivateKey = Buffer.alloc(64, 1).toString("base64");

const mockSendTransaction = jest.fn();
const mockConfirmTransaction = jest.fn();
const mockGetOrCreateAssociatedTokenAccount = jest.fn();
const mockCreateTransferInstruction = jest.fn().mockReturnValue("transfer");
const mockGetAccount = jest.fn();
const mockMintTo = jest.fn();

jest.mock("@solana/web3.js", () => {
  class PublicKey {
    constructor(value) {
      this.value = value;
    }
    toBase58() {
      return this.value;
    }
    toString() {
      return this.value;
    }
  }

  class Transaction {
    constructor() {
      this.instructions = [];
    }
    add(instruction) {
      this.instructions.push(instruction);
      return this;
    }
  }

  const Keypair = {
    fromSecretKey: jest.fn(() => ({
      publicKey: new PublicKey("payer-public-key"),
    })),
  };

  return {
    Connection: jest.fn(() => ({
      sendTransaction: mockSendTransaction,
      confirmTransaction: mockConfirmTransaction,
      requestAirdrop: jest.fn(),
      getBalance: jest.fn(),
    })),
    clusterApiUrl: jest.fn(() => "mock-url"),
    PublicKey,
    Keypair,
    Transaction,
    LAMPORTS_PER_SOL: 1_000_000_000,
  };
});

jest.mock("@solana/spl-token", () => ({
  getOrCreateAssociatedTokenAccount: (...args) =>
    mockGetOrCreateAssociatedTokenAccount(...args),
  createTransferInstruction: (...args) =>
    mockCreateTransferInstruction(...args),
  getAccount: (...args) => mockGetAccount(...args),
  TOKEN_PROGRAM_ID: "token-program",
  TOKEN_2022_PROGRAM_ID: "token-2022-program",
  mintTo: mockMintTo,
  burn: jest.fn(),
  approve: jest.fn(),
  closeAccount: jest.fn(),
  createMint: jest.fn(),
}));

jest.mock("../services/metaplex", () => ({
  metaplex: {
    nfts: () => ({
      create: jest.fn(),
      transfer: jest.fn(),
      findByMint: jest.fn(),
    }),
  },
  payerKeypair: {
    publicKey: {
      toString: () => "payer-public-key",
    },
  },
}));

describe("transferTokens service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env.SOLANA_PRIVATE_KEY = dummyPrivateKey;
  });

  const loadService = async (balance) => {
    mockGetAccount.mockResolvedValue({ amount: balance });
    mockGetOrCreateAssociatedTokenAccount
      .mockResolvedValueOnce({
        address: { toString: () => "from-token-account" },
      })
      .mockResolvedValueOnce({
        address: { toString: () => "to-token-account" },
      });
    mockConfirmTransaction.mockResolvedValue({});

    let service;
    jest.isolateModules(() => {
      service = require("../services/solanaService");
    });

    return service;
  };

  const buildWallet = () => {
    const { PublicKey } = require("@solana/web3.js");
    return {
      publicKey: new PublicKey("FromWallet11111111111111111111111111111111"),
      secretKey: new Uint8Array(64),
    };
  };

  test("throws InsufficientTokenBalanceError without minting additional tokens", async () => {
    const { transferTokens } = await loadService(50n);
    const fromWallet = buildWallet();

    await expect(
      transferTokens(
        "Mint1111111111111111111111111111111111",
        fromWallet,
        "Recipient11111111111111111111111111111111",
        "100",
        "Token"
      )
    ).rejects.toMatchObject({
      name: "InsufficientTokenBalanceError",
      statusCode: 400,
    });

    expect(mockMintTo).not.toHaveBeenCalled();
    expect(mockCreateTransferInstruction).not.toHaveBeenCalled();
    expect(mockSendTransaction).not.toHaveBeenCalled();
  });
});

