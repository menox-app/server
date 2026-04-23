import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('notifications', (table) => {
        table.uuid('id').primary();
        table.uuid('recipient_id').notNullable().index(); // Người nhận (ID user)
        table.uuid('actor_id').notNullable();            // Người gây ra (ID user)
        table.string('type').notNullable();              // 'FOLLOW', 'COMMENT', 'LIKE', v.v.
        table.uuid('entity_id').nullable();              // ID của Post hoặc Comment liên quan
        table.string('content').nullable();              // Nội dung hiển thị nhanh
        table.boolean('is_read').defaultTo(false);
        table.timestamp('created_at').defaultTo(knex.fn.now());

        // Foreign keys (tùy chọn để bảo mật dữ liệu)
        table.foreign('recipient_id').references('id').inTable('users').onDelete('CASCADE');
        table.foreign('actor_id').references('id').inTable('users').onDelete('CASCADE');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('notifications');
}
