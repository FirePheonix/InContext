/** @type {import('next').NextConfig} */
const legacyDashboardRoutes = [
  "/dashboard/academy",
  "/dashboard/analytics",
  "/dashboard/analytics-v1",
  "/dashboard/calendar",
  "/dashboard/chat",
  "/dashboard/coming-soon",
  "/dashboard/crm",
  "/dashboard/crm-v1",
  "/dashboard/default",
  "/dashboard/default-v1",
  "/dashboard/ecommerce",
  "/dashboard/finance",
  "/dashboard/finance-v1",
  "/dashboard/invoice",
  "/dashboard/kanban",
  "/dashboard/logistics",
  "/dashboard/mail",
  "/dashboard/tasks",
];

const nextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/dashboard/overview",
        permanent: false,
      },
      {
        source: "/dashboard/productivity",
        destination: "/dashboard/overview",
        permanent: false,
      },
      {
        source: "/dashboard/users",
        destination: "/dashboard/projects",
        permanent: false,
      },
      ...legacyDashboardRoutes.map((source) => ({
        source,
        destination: "/dashboard/overview",
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
