import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UnitInstruction } from './unit-instruction.entity';

@Injectable()
export class InstructionsService {
  constructor(
    @InjectRepository(UnitInstruction)
    private readonly instructionRepo: Repository<UnitInstruction>,
    private readonly dataSource: DataSource,
  ) {}

  async findOne(unit: string): Promise<string> {
    const row = await this.instructionRepo.findOne({
      where: { unit: unit.trim().toUpperCase() },
    });
    return row?.instructions ?? '';
  }

  async findMultiple(units: string[]): Promise<Record<string, string>> {
    const normalized = units.map((u) => u.trim().toUpperCase()).filter(Boolean);
    if (!normalized.length) return {};

    const rows = await this.instructionRepo
      .createQueryBuilder('ui')
      .select(['ui.unit', 'ui.instructions'])
      .where('ui.unit IN (:...units)', { units: normalized })
      .getMany();

    const map: Record<string, string> = {};
    normalized.forEach((u) => { map[u] = ''; });
    rows.forEach((r) => { map[r.unit] = r.instructions; });
    return map;
  }

  async upsert(unit: string, instructions: string): Promise<string> {
    const text = String(instructions).trim().slice(0, 400);
    const normalized = unit.trim().toUpperCase();

    // Raw upsert — TypeORM upsert() doesn't handle PrimaryColumn elegantly
    await this.dataSource.query(
      `INSERT INTO unit_instructions (unit, instructions, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (unit) DO UPDATE SET instructions = $2, updated_at = NOW()`,
      [normalized, text],
    );

    return text;
  }
}
