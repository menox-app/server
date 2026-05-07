import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable('comment_medias', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        t.uuid('comment_id').notNullable().references('id').inTable('post_comments').onDelete('CASCADE');
        t.uuid('media_id').nullable().references('id').inTable('media').onDelete('SET NULL');
        t.string('url').notNullable();
        t.string('public_id').nullable();
        t.enum('type', ['image', 'video', 'gif', 'sticker', 'audio', 'file']).defaultTo('image');
        t.string('mime_type').nullable();
        t.string('thumbnail_url').nullable();
        t.jsonb('metadata').nullable();
        t.integer('sort_order').notNullable().defaultTo(0);
        t.timestamp('created_at').defaultTo(knex.fn.now());

        t.index(['comment_id', 'sort_order'], 'comment_medias_comment_sort_idx');
        t.index(['media_id'], 'comment_medias_media_id_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('comment_medias');
}
