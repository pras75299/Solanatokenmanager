class InsufficientTokenBalanceError extends Error {
  /**
   * @param {object} params
   * @param {bigint} params.required
   * @param {bigint} params.available
   */
  constructor({ required, available }) {
    const readableRequired = required.toString();
    const readableAvailable = available.toString();

    super(
      `Insufficient token balance: required ${readableRequired} raw units, available ${readableAvailable}.`
    );
    this.name = "InsufficientTokenBalanceError";
    this.statusCode = 400;
    this.details = {
      required: readableRequired,
      available: readableAvailable,
    };
  }
}

module.exports = {
  InsufficientTokenBalanceError,
};


