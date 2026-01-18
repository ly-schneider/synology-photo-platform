export function isAdminEnabled(): boolean {
  return !!(
    process.env.ADMIN_USERNAME &&
    process.env.ADMIN_PASSWORD &&
    process.env.ADMIN_JWT_SECRET
  );
}

export function getAdminConfig() {
  return {
    username: process.env.ADMIN_USERNAME ?? "",
    password: process.env.ADMIN_PASSWORD ?? "",
    jwtSecret: process.env.ADMIN_JWT_SECRET ?? "",
  };
}
