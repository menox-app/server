import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.table('users', (table) => {
        table.dropColumn('is_pro');
        table.dropColumn('avatar_frame_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.table('users', (table) => {
        table.boolean('is_pro').defaultTo(false);
        table.uuid('avatar_frame_id').nullable();
    });
}
