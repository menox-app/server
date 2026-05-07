import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_comments', (t) => {
        t.dropColumn('media_metadata');
        t.dropColumn('media_url');
        t.dropColumn('type');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_comments', (t) => {
        t.enum('type', ['text', 'image', 'video', 'gif', 'sticker']).defaultTo('text');
        t.string('media_url').nullable();
        t.jsonb('media_metadata').nullable();
    });
}
