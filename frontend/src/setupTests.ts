import "@testing-library/jest-dom/vitest";

const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

afterAll(() => {
  consoleErrorSpy.mockRestore();
});
