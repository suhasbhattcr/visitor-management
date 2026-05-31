import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate login credentials.
   * expectedRole: if provided, login is rejected when user.role !== expectedRole.
   */
  async login(
    userId: string,
    pin: string,
    expectedRole?: 'resident' | 'security',
  ): Promise<Omit<User, 'pin'> & { name: string }> {
    const id = String(userId).trim().toLowerCase();
    const user = await this.repo.findOne({ where: { id } });

    if (!user || user.pin !== String(pin).trim()) {
      throw new UnauthorizedException('Invalid username or PIN');
    }

    if (expectedRole && user.role !== expectedRole) {
      throw new UnauthorizedException(
        `This account is not a ${expectedRole} account`,
      );
    }

    // Update last_seen_at via raw query (can't set @UpdateDateColumn manually)
    this.dataSource.query(`UPDATE users SET last_seen_at = NOW() WHERE id = $1`, [user.id]).catch(() => {});

    const { pin: _pin, ...rest } = user as any;
    return { ...rest, name: user.name } as Omit<User, 'pin'> & { name: string };
  }

  /** All residents ordered by unit then first_name. */
  async findResidents(): Promise<Array<Omit<User, 'pin'> & { name: string }>> {
    const rows = await this.repo.find({
      where: { role: 'resident' },
      order: { unit: 'ASC', first_name: 'ASC' },
    });
    return rows.map(({ pin: _p, ...r }) => ({ ...r, name: `${r.first_name} ${r.last_name}`.trim() }));
  }

  /** Distinct unit codes that have at least one resident. */
  async findResidentUnits(): Promise<string[]> {
    const rows: { unit: string }[] = await this.dataSource.query(
      `SELECT DISTINCT unit FROM users WHERE role = 'resident' AND unit IS NOT NULL ORDER BY unit ASC`,
    );
    return rows.map((r) => r.unit);
  }

  /** All security officers ordered by gate then first_name. */
  async findSecurityOfficers(): Promise<Array<Omit<User, 'pin'> & { name: string }>> {
    const rows = await this.repo.find({
      where: { role: 'security' },
      order: { gate: 'ASC', first_name: 'ASC' },
    });
    return rows.map(({ pin: _p, ...r }) => ({ ...r, name: `${r.first_name} ${r.last_name}`.trim() }));
  }

  /** Upsert a user record on socket connect. */
  async upsert(user: {
    id: string;
    role: 'resident' | 'security';
    first_name?: string | null;
    last_name?: string | null;
    unit?: string | null;
    gate?: string | null;
  }): Promise<void> {
    const id = String(user.id).trim().slice(0, 40);
    const first_name = user.first_name ? String(user.first_name).trim().slice(0, 60) : null;
    const last_name = user.last_name ? String(user.last_name).trim().slice(0, 60) : null;
    const unit = user.unit ? String(user.unit).trim().toUpperCase().slice(0, 20) : null;
    const gate = user.gate ? String(user.gate).trim().slice(0, 40) : null;

    await this.dataSource.query(
      `INSERT INTO users (id, role, first_name, last_name, unit, gate, last_seen_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE
         SET first_name    = COALESCE(EXCLUDED.first_name, users.first_name),
             last_name     = COALESCE(EXCLUDED.last_name,  users.last_name),
             unit          = COALESCE(EXCLUDED.unit, users.unit),
             gate          = COALESCE(EXCLUDED.gate, users.gate),
             last_seen_at  = NOW()`,
      [id, user.role, first_name, last_name, unit, gate],
    );
  }
}

