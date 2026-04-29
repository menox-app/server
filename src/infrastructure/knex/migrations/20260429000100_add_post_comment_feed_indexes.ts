import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_comments', (table) => {
        table.index(['post_id'], 'post_comments_post_id_idx');
        table.index(['post_id', 'parent_id', 'created_at'], 'post_comments_post_parent_created_idx');
        table.index(['parent_id'], 'post_comments_parent_id_idx');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable('post_comments', (table) => {
        table.dropIndex(['post_id'], 'post_comments_post_id_idx');
        table.dropIndex(['post_id', 'parent_id', 'created_at'], 'post_comments_post_parent_created_idx');
        table.dropIndex(['parent_id'], 'post_comments_parent_id_idx');
    });
}
