const fs = require("fs");
const path = require("path");
const request = require("supertest");

const mockCloudinaryUpload = jest.fn();
const mockCloudinaryConfig = jest.fn();

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      upload: mockCloudinaryUpload,
    },
    config: mockCloudinaryConfig,
  },
}));

const mockMintNFT = jest.fn();

jest.mock("../services/solanaService", () => ({
  mintNFT: mockMintNFT,
}));

const mockNFTModel = jest.fn().mockImplementation((doc) => ({
  ...doc,
  save: jest.fn().mockResolvedValue(),
}));

jest.mock("../models/NFT", () => mockNFTModel);

process.env.CLOUDINARY_CLOUD_NAME =
  process.env.CLOUDINARY_CLOUD_NAME || "test-cloud";
process.env.CLOUDINARY_API_KEY =
  process.env.CLOUDINARY_API_KEY || "test-key";
process.env.CLOUDINARY_API_SECRET =
  process.env.CLOUDINARY_API_SECRET || "test-secret";

const nftController = require("../controllers/nftController");
const { createApp } = require("../app");

const VALID_PUBLIC_KEY = "4Nd1mW2JxYNrP4QW7w3fGH5pK9mHF4RS8Pf63HgFNDNm";
const UPLOAD_DIR = path.resolve("./tmp/uploads");

const buildResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("nftController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    if (fs.existsSync(UPLOAD_DIR)) {
      fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(UPLOAD_DIR)) {
      fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
    }
  });

  test("mintNFT preserves metadata URI and rewrites image fields", async () => {
    const originalMetadataUri = "https://example.com/metadata.json";
    const cloudinaryImageUrl =
      "https://res.cloudinary.com/test/image/upload/v1/sample.webp";

    mockCloudinaryUpload.mockResolvedValue({ secure_url: cloudinaryImageUrl });
    mockMintNFT.mockResolvedValue(
      "NFT minted successfully, Mint Address: Mint11111111111111111111111111111"
    );

    const req = {
      body: {
        recipientPublicKey: VALID_PUBLIC_KEY,
        metadata: {
          uri: originalMetadataUri,
          name: "Test NFT",
          symbol: "TNFT",
        },
      },
    };

    const res = buildResponse();

    await nftController.mintNFT(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockCloudinaryUpload).toHaveBeenCalledTimes(1);
    const mintedMetadata = mockMintNFT.mock.calls[0][1];
    expect(mintedMetadata.uri).toBe(originalMetadataUri);
    expect(mintedMetadata.image).toBe(cloudinaryImageUrl);
    expect(mintedMetadata.properties.files[0].uri).toBe(cloudinaryImageUrl);

    expect(mockNFTModel).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: cloudinaryImageUrl,
        mintAddress: "Mint11111111111111111111111111111",
      })
    );
  });

  test("uploadImage succeeds when upload directory is missing", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/api/upload-image")
      .attach("file", Buffer.from("fake-image-content"), {
        filename: "example.png",
        contentType: "image/png",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Wallet address is required.");
    expect(mockCloudinaryUpload).not.toHaveBeenCalled();
  });
});

