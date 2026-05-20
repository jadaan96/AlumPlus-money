import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../lib/config";

export interface AuthPayload {
  userId: string;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "غير مصرح" });
  }
  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "انتهت صلاحية الجلسة" });
  }
}
