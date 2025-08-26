import * as jwt from 'jsonwebtoken';
import { UserRole } from '../types/user.types';

interface JwtPayload {
  uid: string;
  email: string;
  role: UserRole;
}

export const generateJWT = (
  uid: string,
  email: string,
  role: UserRole,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const payload: JwtPayload = { uid, email, role };

    jwt.sign(
      payload,
      process.env.JWT_KEY,
      {
        expiresIn: '24h',
      },
      (err: Error | null, token: string | undefined) => {
        if (err) {
          reject(new Error('No se pudo generar el JWT'));
        } else {
          resolve(token);
        }
      },
    );
  });
};

export const checkJWT = (token: string = ''): [boolean, JwtPayload | null] => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_KEY) as JwtPayload;
    return [true, decoded];
  } catch (error) {
    console.error(error);
    return [false, null];
  }
};
