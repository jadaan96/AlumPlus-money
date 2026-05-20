import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { loginSchema } from "@workshop/shared";
import { prisma } from "../lib/prisma";
import { config } from "../lib/config";
import { validateBody } from "../middleware/validate";
import { authMiddleware } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";

const router = Router();

function signAccess(userId: string, username: string) {
  return jwt.sign({ userId, username }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires as jwt.SignOptions["expiresIn"],
  });
}

async function createRefreshToken(userId: string) {
  const token = crypto.randomBytes(48).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });
  return token;
}

router.post("/login", validateBody(loginSchema), asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
  }
  const accessToken = signAccess(user.id, user.username);
  const refreshToken = await createRefreshToken(user.id);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({
    accessToken,
    user: { id: user.id, username: user.username },
  });
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: "لا يوجد رمز تحديث" });
  const stored = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: "رمز التحديث غير صالح" });
  }
  const accessToken = signAccess(stored.user.id, stored.user.username);
  res.json({ accessToken });
}));

router.post("/logout", asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }
  res.clearCookie("refreshToken");
  res.json({ ok: true });
}));

router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

export default router;
