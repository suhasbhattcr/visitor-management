import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WatchlistEntry } from './watchlist.entity';
import { CreateWatchlistDto } from './dto/create-watchlist.dto';

@Injectable()
export class WatchlistService {
  constructor(
    @InjectRepository(WatchlistEntry)
    private readonly watchlistRepo: Repository<WatchlistEntry>,
  ) {}

  async check(name?: string, phone?: string) {
    if (!name && !phone) return { matches: [] };

    const qb = this.watchlistRepo
      .createQueryBuilder('w')
      .orderBy('w.created_at', 'DESC')
      .limit(10);

    if (name && phone) {
      qb.where('LOWER(w.person_name) LIKE :name OR w.phone_number = :phone', {
        name: `%${String(name).trim().toLowerCase()}%`,
        phone: String(phone).trim(),
      });
    } else if (name) {
      qb.where('LOWER(w.person_name) LIKE :name', {
        name: `%${String(name).trim().toLowerCase()}%`,
      });
    } else {
      qb.where('w.phone_number = :phone', { phone: String(phone).trim() });
    }

    const matches = await qb.getMany();
    return { matches };
  }

  async findAll() {
    const watchlist = await this.watchlistRepo.find({
      order: { created_at: 'DESC' },
    });
    return { watchlist };
  }

  async create(dto: CreateWatchlistDto) {
    const entity = this.watchlistRepo.create({
      person_name: String(dto.person_name).trim().slice(0, 120),
      phone_number: dto.phone_number ? String(dto.phone_number).trim().slice(0, 40) : null,
      reason: dto.reason ? String(dto.reason).trim().slice(0, 500) : null,
      added_by: dto.added_by ? String(dto.added_by).trim().slice(0, 80) : null,
    });
    const entry = await this.watchlistRepo.save(entity);
    return { entry };
  }

  async remove(id: number) {
    const result = await this.watchlistRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Watchlist entry not found');
    return { success: true };
  }
}
