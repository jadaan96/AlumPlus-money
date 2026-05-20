import dotenv from "dotenv";

dotenv.config();

const corsRaw = process.env.CORS_ORIGIN || "http://localhost:5173";
/** عدة دومينات مفصولة بفاصلة للإنتاج (فرونت + معاينة) */
export const corsOrigins = corsRaw
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  corsOrigins,
  /** @deprecated استخدم corsOrigins */
  corsOrigin: corsOrigins[0] || "http://localhost:5173",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-in-production",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
    accessExpires: process.env.JWT_ACCESS_EXPIRES || "15m",
    refreshExpires: process.env.JWT_REFRESH_EXPIRES || "7d",
  },
};
