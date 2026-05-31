import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('watchlist')
export class WatchlistEntry {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  person_name: string;

  @Column({ type: 'varchar', length: 40, nullable: true, default: null })
  phone_number: string | null;

  @Column({ type: 'text', nullable: true, default: null })
  reason: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true, default: null })
  added_by: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;
}
