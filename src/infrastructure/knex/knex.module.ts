import { Module, Global, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import knex, { Knex } from 'knex';

// Provider token - dùng để inject Knex instance
export const KNEX_CONNECTION = 'KNEX_CONNECTION';

// Factory provider cho Knex
const knexProvider: Provider = {
  provide: KNEX_CONNECTION,
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => {
    const isTest = configService.get('APP_ENV') === 'test';
    const dbName = configService.get('DB_NAME');
    const testDbName = isTest ? `${dbName}_test` : dbName;

    // Nếu là môi trường test, tự động tạo test database nếu chưa có
    if (isTest) {
      const adminConnection = knex({
        client: configService.get('DB_CLIENT', 'pg'),
        connection: {
          host: configService.get('DB_HOST', 'localhost'),
          port: configService.get('DB_PORT', 5432),
          user: configService.get('DB_USER', 'postgres'),
          password: configService.get('DB_PASSWORD', 'postgres'),
          database: 'postgres', // Kết nối vào database mặc định
          ssl: configService.get('DB_SSL') === 'true' || configService.get('DB_SSL') === true ? { rejectUnauthorized: false } : false,
        },
      });

      try {
        const result = await adminConnection.raw(
          `SELECT 1 FROM pg_database WHERE datname = ?`,
          [testDbName],
        );

        if (result.rows.length === 0) {
          await adminConnection.raw(`CREATE DATABASE ${testDbName}`);
        }
      } catch (error) {
        console.error('Error creating test database:', error);
      } finally {
        await adminConnection.destroy();
      }
    }

    const connection = knex({
      client: configService.get('DB_CLIENT', 'pg'),
      connection: {
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        user: configService.get('DB_USER', 'postgres'),
        password: configService.get('DB_PASSWORD', 'postgres'),
        database: testDbName,
        ssl: configService.get('DB_SSL') === 'true' || configService.get('DB_SSL') === true ? { rejectUnauthorized: false } : false,
      },
      pool: {
        min: 2,
        max: 10,
      },
      migrations: {
        directory: './src/infrastructure/knex/migrations',
        tableName: 'knex_migrations',
      },
    });

    // Kiểm tra kết nối
    try {
      await connection.raw('SELECT 1');
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }

    return connection;
  },
};

@Global()
@Module({
  imports: [ConfigModule],
  providers: [knexProvider],
  exports: [knexProvider],
})
export class KnexModule {}
