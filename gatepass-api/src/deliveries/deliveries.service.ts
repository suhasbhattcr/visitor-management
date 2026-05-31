import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Delivery } from './delivery.entity';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { EventsService } from '../events/events.service';

const EVENTS = {
  DELIVERY_CREATED: 'DELIVERY_CREATED',
  DELIVERY_APPROVED: 'DELIVERY_APPROVED',
  DELIVERY_REJECTED: 'DELIVERY_REJECTED',
  VISITOR_EXITED: 'VISITOR_EXITED',
} as const;

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveryRepo: Repository<Delivery>,
    private readonly eventsService: EventsService,
    private readonly dataSource: DataSource,
  ) {}

  async findRecentVisitors() {
    const rows = await this.dataSource.query<
      Array<{ delivery_person_name: string; company: string; phone_number: string; visitor_category: string }>
    >(
      `SELECT DISTINCT ON (delivery_person_name, phone_number)
         delivery_person_name, company, phone_number, visitor_category
       FROM deliveries
       WHERE created_at > NOW() - INTERVAL '30 days'
       ORDER BY delivery_person_name, phone_number, created_at DESC
       LIMIT 20`,
    );
    return { visitors: rows };
  }

  async findAll(q: QueryDeliveryDto) {
    const safeLimit = Math.min(parseInt(q.limit ?? '200', 10) || 200, 500);

    const qb = this.deliveryRepo
      .createQueryBuilder('d')
      .orderBy('d.created_at', 'DESC')
      .limit(safeLimit);

    if (q.unit) qb.andWhere('d.unit = :unit', { unit: q.unit });
    if (q.approval_status) qb.andWhere('d.approval_status = :as', { as: q.approval_status });
    if (q.delivery_status) qb.andWhere('d.delivery_status = :ds', { ds: q.delivery_status });
    if (q.gate) qb.andWhere('d.gate = :gate', { gate: q.gate });
    if (q.date)
      qb.andWhere("DATE(d.created_at AT TIME ZONE 'UTC') = :date", { date: q.date });

    const deliveries = await qb.getMany();
    return { deliveries };
  }

  async createMany(dto: CreateDeliveryDto) {
    const category = dto.visitor_category || 'DELIVERY';

    const deliveries = await Promise.all(
      dto.units.map(async (unit) => {
        const entity = this.deliveryRepo.create({
          delivery_person_name: String(dto.delivery_person_name).trim().slice(0, 120),
          company: String(dto.company).trim().slice(0, 120),
          phone_number: String(dto.phone_number).trim().slice(0, 40),
          unit: String(unit).trim().toUpperCase(),
          parcel_image: dto.parcel_image || null,
          gate: dto.gate ? String(dto.gate).trim().slice(0, 50) : null,
          visitor_category: category,
          vehicle_number: dto.vehicle_number ? String(dto.vehicle_number).trim().slice(0, 40) : null,
        });
        const saved = await this.deliveryRepo.save(entity);
        await this.eventsService.publish(EVENTS.DELIVERY_CREATED, saved);
        return saved;
      }),
    );

    return { deliveries };
  }

  private async updateStatus(id: number, updates: Partial<Delivery>): Promise<Delivery> {
    const delivery = await this.deliveryRepo.preload({ id, ...updates });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return this.deliveryRepo.save(delivery);
  }

  async approve(id: number) {
    const delivery = await this.updateStatus(id, { approval_status: 'APPROVED' });
    await this.eventsService.publish(EVENTS.DELIVERY_APPROVED, delivery);
    return { delivery };
  }

  async reject(id: number) {
    const delivery = await this.updateStatus(id, { approval_status: 'REJECTED' });
    await this.eventsService.publish(EVENTS.DELIVERY_REJECTED, delivery);
    return { delivery };
  }

  async exitVisitor(id: number) {
    const source = await this.deliveryRepo.findOne({ where: { id } });
    if (!source) throw new NotFoundException('Delivery not found');

    const exitedAt = new Date();

    const linked = await this.dataSource.query<Delivery[]>(
      `SELECT * FROM deliveries
       WHERE delivery_person_name = $1
         AND phone_number = $2
         AND DATE(created_at AT TIME ZONE 'UTC') = DATE($3 AT TIME ZONE 'UTC')
         AND delivery_status != 'EXITED'`,
      [source.delivery_person_name, source.phone_number, source.created_at],
    );

    const updated: Delivery[] = [];
    for (const row of linked) {
      const delivery = await this.updateStatus(Number(row.id), {
        delivery_status: 'EXITED',
        exited_at: exitedAt,
      });
      if (row.approval_status === 'APPROVED') {
        await this.eventsService.publish(EVENTS.VISITOR_EXITED, delivery);
      }
      updated.push(delivery);
    }

    return { deliveries: updated };
  }
}
