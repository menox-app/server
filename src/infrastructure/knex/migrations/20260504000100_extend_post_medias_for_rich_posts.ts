import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_medias', (t) => {
        t.string('mime_type').nullable();
        t.string('thumbnail_url').nullable();
        t.jsonb('metadata').nullable();
        t.integer('sort_order').notNullable().defaultTo(0);
    });

    await knex.raw(`
        ALTER TABLE post_medias DROP CONSTRAINT IF EXISTS post_medias_type_check;
        ALTER TABLE post_medias
        ADD CONSTRAINT post_medias_type_check
        CHECK (type IN ('image', 'video'));
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE post_medias DROP CONSTRAINT IF EXISTS post_medias_type_check;
        ALTER TABLE post_medias
        ADD CONSTRAINT post_medias_type_check
        CHECK (type IN ('image', 'video'));
    `);

    await knex.schema.alterTable('post_medias', (t) => {
        t.dropColumn('sort_order');
        t.dropColumn('metadata');
        t.dropColumn('thumbnail_url');
        t.dropColumn('mime_type');
    });
}
