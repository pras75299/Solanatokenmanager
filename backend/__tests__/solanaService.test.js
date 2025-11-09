const { convertAmountToRawUnits } = require("../services/solanaService");

describe("convertAmountToRawUnits", () => {
  test("converts decimal strings to bigint based raw units", () => {
    expect(convertAmountToRawUnits("1.23456789")).toBe(1234567890n);
    expect(convertAmountToRawUnits("0.000000001")).toBe(1n);
    expect(convertAmountToRawUnits("10")).toBe(10000000000n);
  });

  test("accepts numeric inputs by coercing to string", () => {
    expect(convertAmountToRawUnits(2)).toBe(2000000000n);
  });

  test("rejects negative and malformed values", () => {
    expect(() => convertAmountToRawUnits("-1")).toThrow(
      /Amount must be a positive numeric string/
    );
    expect(() => convertAmountToRawUnits("abc")).toThrow(
      /Amount must be a positive numeric string/
    );
  });

  test("enforces decimal precision limits", () => {
    expect(() => convertAmountToRawUnits("0.1234567891")).toThrow(
      /decimal places/
    );
  });
});
