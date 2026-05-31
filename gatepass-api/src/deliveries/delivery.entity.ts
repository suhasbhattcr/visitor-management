import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 120 })
  delivery_person_name: string;

  @Column({ length: 120 })
  company: string;

  @Column({ length: 40 })
  phone_number: string;

  @Column({ length: 20 })
  unit: string;

  @Column({ length: 20, default: 'PENDING' })
  approval_status: string;

  @Column({ length: 20, default: 'PENDING' })
  delivery_status: string;

  @Column({ type: 'text', nullable: true, default: null })
  parcel_image: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: null })
  gate: string | null;

  @Column({ length: 40, default: 'DELIVERY' })
  visitor_category: string;

  @Column({ type: 'varchar', length: 40, nullable: true, default: null })
  vehicle_number: string | null;

  @Column({ type: 'timestamp', nullable: true, default: null })
  exited_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}
