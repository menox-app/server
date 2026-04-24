import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('media', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        t.string('url').notNullable();
        t.string('remote_id').notNullable();
        t.string('provider').notNullable();
        t.string('mime_type').nullable();
        t.integer('size').nullable();
        t.string('folder').nullable();
        t.boolean('is_used').defaultTo(false); // Quan trọng: flag để biết file đã được gắn vào bản ghi nào chưa
        t.uuid('user_id').nullable();
        t.timestamps(true, true);
        t.index(['remote_id', 'is_used']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('media');
}

