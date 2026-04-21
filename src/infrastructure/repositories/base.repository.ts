import { Inject } from '@nestjs/common';
import { Knex } from 'knex';
import { KNEX_CONNECTION } from '../knex/knex.module';

export abstract class BaseRepository {
  constructor(@Inject(KNEX_CONNECTION) protected readonly knex: Knex) {}

  async findAll(
    tableName: string,
    page = 1,
    limit = 10,
    orderBy = 'id',
    order: 'asc' | 'desc' = 'asc',
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    pageCount: number;
  }> {
    const offset = (page - 1) * limit;

    const [data, countResult] = await Promise.all([
      this.knex(tableName).orderBy(orderBy, order).limit(limit).offset(offset),
      this.knex(tableName).count('id as count').first(),
    ]);

    const total = Number(countResult?.count || 0);
    const pageCount = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      pageCount,
    };
  }

  async findById(tableName: string, id: number | string): Promise<any | null> {
    return this.knex(tableName).where('id', id).first() || null;
  }

  async findByCondition(
    tableName: string,
    condition: Record<string, any>,
  ): Promise<any[]> {
    return this.knex(tableName).where(condition);
  }

  async findOneByCondition(
    tableName: string,
    condition: Record<string, any>,
  ): Promise<any | null> {
    return this.knex(tableName).where(condition).first() || null;
  }

  async create(tableName: string, data: Record<string, any>): Promise<any> {
    const [result] = await this.knex(tableName).insert(data).returning('*');
    return result;
  }

  async createMany(
    tableName: string,
    data: Record<string, any>[],
  ): Promise<any[]> {
    return this.knex(tableName).insert(data).returning('*');
  }

  async update(
    tableName: string,
    id: number | string,
    data: Record<string, any>,
  ): Promise<any | null> {
    const [result] = await this.knex(tableName)
      .where('id', id)
      .update(data)
      .returning('*');
    return result || null;
  }

  async delete(tableName: string, id: number | string): Promise<boolean> {
    const result = await this.knex(tableName).where('id', id).delete();
    return result > 0;
  }

  async transaction<R>(
    callback: (trx: Knex.Transaction) => Promise<R>,
  ): Promise<R> {
    return this.knex.transaction(callback);
  }

  getKnex(): Knex {
    return this.knex;
  }

  getQueryBuilder(tableName: string) {
    return this.knex(tableName);
  }
}
