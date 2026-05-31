import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Preregistration } from './preregistration.entity';
import { CreatePreregistrationDto } from './dto/create-preregistration.dto';

@Injectable()
export class PreregistrationsService {
  constructor(
    @InjectRepository(Preregistration)
    private readonly preregRepo: Repository<Preregistration>,
  ) {}

  async findAll(unit?: string, date?: string) {
    const qb = this.preregRepo
      .createQueryBuilder('p')
      .orderBy('p.expected_date', 'ASC')
      .addOrderBy('p.created_at', 'DESC');

    if (unit) qb.andWhere('p.unit = :unit', { unit: String(unit).trim().toUpperCase() });
    if (date) qb.andWhere('p.expected_date = :date', { date });

    const preregistrations = await qb.getMany();
    return { preregistrations };
  }

  async create(dto: CreatePreregistrationDto) {
    const entity = this.preregRepo.create({
      unit: String(dto.unit).trim().toUpperCase(),
      visitor_name: String(dto.visitor_name).trim().slice(0, 120),
      company: dto.company ? String(dto.company).trim().slice(0, 120) : null,
      purpose: dto.purpose ? String(dto.purpose).trim().slice(0, 200) : null,
      expected_date: dto.expected_date,
    });
    const preregistration = await this.preregRepo.save(entity);
    return { preregistration };
  }

  async remove(id: number) {
    const result = await this.preregRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Pre-registration not found');
    return { success: true };
  }
}
