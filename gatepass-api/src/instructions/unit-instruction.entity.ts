import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('unit_instructions')
export class UnitInstruction {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  unit: string;

  @Column({ type: 'text', default: '' })
  instructions: string;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;
}
