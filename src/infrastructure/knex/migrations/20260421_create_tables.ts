import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.string('email').unique().notNullable();
      t.string('password_hash').nullable();
      t.string('username').unique().notNullable();
      t.string('display_name').nullable();
      t.string('avatar_url').nullable();
      t.string('bio', 160).nullable();
      t.boolean('is_pro').defaultTo(false);
      t.string('avatar_frame_id').nullable();
      t.enum('role', ['USER', 'ADMIN', 'MODERATOR']).defaultTo('USER');
      t.boolean('is_verified').defaultTo(false);
      t.boolean('is_active').defaultTo(true);
      t.timestamps(true, true);
      t.index(['email', 'username']);
    });
  }

  if (!(await knex.schema.hasTable('user_avatars'))) {
    await knex.schema.createTable('user_avatars', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('user_id').notNullable();
      t.string('url').notNullable();
      t.string('public_id').nullable();
      t.boolean('is_current').defaultTo(false);
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.index(['user_id']);
    });
  }

  if (!(await knex.schema.hasTable('accounts'))) {
    await knex.schema.createTable('accounts', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('user_id').notNullable();
      t.enum('provider', ['GOOGLE', 'APPLE', 'CREDENTIALS']).notNullable();
      t.string('provider_account_id').notNullable();
      t.text('access_token').nullable();
      t.text('id_token').nullable();
      t.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.unique(['provider', 'provider_account_id']);
    });
  }

  if (!(await knex.schema.hasTable('sessions'))) {
    await knex.schema.createTable('sessions', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('user_id').notNullable();
      t.string('token').unique().notNullable();
      t.string('device_info').nullable();
      t.string('ip_address').nullable();
      t.timestamp('expires_at').notNullable();
      t.foreign('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.index(['user_id']);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sessions');
  await knex.schema.dropTableIfExists('accounts');
  await knex.schema.dropTableIfExists('user_avatars');
  await knex.schema.dropTableIfExists('users');
}
