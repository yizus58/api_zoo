import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/types/user-role';
import { flag } from '../../config/env.validation';
import { User } from './user.model';
import { BCRYPT_ROUNDS } from './users.service';

export const ADMIN_EMAIL = 'admin@mail.com';

/**
 * Creates admin@mail.com with ADMIN_PASSWORD when SEED_ADMIN=true (default in development).
 * Never changes an existing admin.
 */
@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectModel(User) private readonly users: typeof User,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled = flag(
      this.config.get('SEED_ADMIN'),
      this.config.get('NODE_ENV') === 'development',
    );
    if (enabled) {
      await this.seed();
    }
  }

  async seed(): Promise<boolean> {
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!password) {
      throw new Error(
        'ADMIN_PASSWORD must be set to seed the admin user (SEED_ADMIN=true or NODE_ENV=development)',
      );
    }
    const existing = await this.users.findOne({
      where: { email: ADMIN_EMAIL },
    });
    if (existing) {
      return false;
    }
    await this.users.create({
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      role: UserRole.ADMIN,
    });
    this.logger.log(`Admin user ${ADMIN_EMAIL} created`);
    return true;
  }
}
