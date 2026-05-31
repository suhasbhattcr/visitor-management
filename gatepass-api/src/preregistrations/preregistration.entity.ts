import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('visitor_preregistrations')
export class Preregistration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  unit: string;

  @Column({ length: 120 })
  visitor_name: string;

  @Column({ type: 'varchar', length: 120, nullable: true, default: null })
  company: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true, default: null })
  purpose: string | null;

  @Column({ type: 'date' })
  expected_date: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;
}
