import type { Knex } from "knex";


export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_comments', (table) => {
        table.enum('type', ['text', 'image', 'video', 'gif', 'sticker']).defaultTo('text');
        table.string('media_url').nullable();
        table.jsonb('media_metadata').nullable();
    })
}


export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_comments', (table) => {
        table.dropColumn('type');
        table.dropColumn('media_url');
        table.dropColumn('media_metadata');
    })
}

