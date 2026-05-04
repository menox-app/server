import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('media', (t) => {
        t.jsonb('metadata').nullable();
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('media', (t) => {
        t.dropColumn('metadata');
    });
}
