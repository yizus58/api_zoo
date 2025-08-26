import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

interface JwtPayload {
  uid: string;
}

interface AuthenticatedRequest extends Request {
  uid?: string;
}

export const validateJWT = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void | Response => {
  let token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({
      result: false,
      msg: 'No hay token en la peticion',
    });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY) as JwtPayload;
    const { uid } = decoded;

    req.uid = uid;

    next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({
      result: false,
      msg: 'Token no valido',
    });
  }
};
