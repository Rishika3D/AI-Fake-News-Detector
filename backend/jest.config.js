export default {
  testEnvironment: "node",
  // ESM support — no transform needed, Node handles it natively
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
};
