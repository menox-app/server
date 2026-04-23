import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('follows', (t) => {
        t.uuid('follower_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.uuid('following_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.primary(['follower_id', 'following_id']);

        t.index(['follower_id', 'following_id']);
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable('follows');
}

