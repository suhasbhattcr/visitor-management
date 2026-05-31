import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('users')
export class User {
  /** Stable unique user ID — format: <flat><seq> for residents, security1-5 for officers. */
  @PrimaryColumn({ type: 'varchar', length: 40 })
  id: string;

  @Column({ type: 'varchar', length: 20 })
  role: string; // 'resident' | 'security'

  @Column({ name: 'first_name', type: 'varchar', length: 60 })
  first_name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 60 })
  last_name: string;

  /** Computed full name helper (not a DB column). */
  get name(): string {
    return `${this.first_name} ${this.last_name}`.trim();
  }

  @Column({ type: 'varchar', length: 120, nullable: true, unique: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  phone: string | null;

  /** Flat unit code — set for residents, null for security. */
  @Column({ type: 'varchar', length: 20, nullable: true, default: null })
  unit: string | null;

  /** Gate assignment — set for security officers, null for residents. */
  @Column({ type: 'varchar', length: 40, nullable: true, default: null })
  gate: string | null;

  /** Plain PIN for login (4-digit). */
  @Column({ type: 'varchar', length: 80 })
  pin: string;

  @Column({ name: 'last_seen_at', type: 'timestamp', default: () => 'NOW()' })
  last_seen_at: Date;
}
