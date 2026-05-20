import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Prisma } from "@prisma/client";
import { config } from "./lib/config";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import periodRoutes from "./routes/periods";
import workshopRoutes from "./routes/workshops";
import expenseRoutes from "./routes/expenses";
import employeeRoutes from "./routes/employees";
import salaryRoutes from "./routes/salaries";
import paymentRoutes from "./routes/payments";
import dashboardRoutes from "./routes/dashboard";
import importRoutes from "./routes/import";
import reportRoutes from "./routes/reports";

const app = express();

if (process.env.TRUST_PROXY === "1" || process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: config.corsOrigins.length === 1 ? config.corsOrigins[0] : config.corsOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);

app.use(authMiddleware);
app.use("/api/periods", periodRoutes);
app.use("/api/workshops", workshopRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/import", importRoutes);
app.use("/api/reports", reportRoutes);

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return res.status(409).json({ error: "السجل موجود مسبقاً" });
      }
      if (err.code === "P2025") {
        return res.status(404).json({ error: "السجل غير موجود" });
      }
    }
    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }
    res.status(500).json({ error: "خطأ داخلي في الخادم" });
  }
);

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
