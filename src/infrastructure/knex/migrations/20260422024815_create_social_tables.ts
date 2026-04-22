import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
    // Tạo bảng posts
    await knex.schema.createTable('posts', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        // Thay vì tách ra, chúng ta khai báo references ngay tại đây
        t.uuid('author_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.text('content').nullable();
        t.enum('visibility', ['public', 'private', 'friends']).notNullable().defaultTo('public');
        t.timestamps(true, true);
        t.index('author_id');
    });

    // Tạo bảng post_medias
    await knex.schema.createTable('post_medias', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
        t.string('url').notNullable();
        t.string('public_id').nullable();
        t.enum('type', ['image', 'video']).defaultTo('image');
        t.timestamp('created_at').defaultTo(knex.fn.now());
    });

    // Tạo bảng post_reactions
    await knex.schema.createTable('post_reactions', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
        t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.string('type').notNullable().defaultTo('like');
        t.timestamp('created_at').defaultTo(knex.fn.now());
        t.unique(['post_id', 'user_id']);
    });

    // Tạo bảng post_comments
    await knex.schema.createTable('post_comments', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        t.uuid('post_id').notNullable().references('id').inTable('posts').onDelete('CASCADE');
        t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        t.uuid('parent_id').nullable().references('id').inTable('post_comments').onDelete('CASCADE');
        t.text('content').notNullable();
        t.integer('depth').defaultTo(0);
        t.timestamps(true, true);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('post_comments');
    await knex.schema.dropTableIfExists('post_reactions');
    await knex.schema.dropTableIfExists('post_medias');
    await knex.schema.dropTableIfExists('posts');
}
