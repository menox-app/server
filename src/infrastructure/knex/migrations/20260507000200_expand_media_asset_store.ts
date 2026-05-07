import type { Knex } from 'knex';

const MEDIA_TYPES = ['image', 'video', 'audio', 'gif', 'sticker', 'file'];
const MEDIA_STATUSES = ['ready', 'failed', 'blocked', 'deleted'];
const MEDIA_VISIBILITIES = ['public', 'private', 'restricted'];
const MEDIA_VARIANTS = ['original', 'thumbnail', 'small', 'medium', 'large', 'preview', 'waveform'];

export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable('media', (t) => {
        t.string('type').nullable();
        t.string('status').notNullable().defaultTo('ready');
        t.string('visibility').notNullable().defaultTo('private');
        t.string('checksum').nullable();
        t.timestamp('deleted_at').nullable();
    });

    await knex.raw(`
        UPDATE media
        SET type = CASE
            WHEN mime_type = 'image/gif' THEN 'gif'
            WHEN mime_type LIKE 'image/%' THEN 'image'
            WHEN mime_type LIKE 'video/%' THEN 'video'
            WHEN mime_type LIKE 'audio/%' THEN 'audio'
            ELSE 'file'
        END
        WHERE type IS NULL;
    `);

    await knex.raw(`ALTER TABLE media ALTER COLUMN type SET NOT NULL;`);

    await knex.raw(`
        ALTER TABLE media
        ADD CONSTRAINT media_type_check
        CHECK (type IN (${MEDIA_TYPES.map((type) => `'${type}'`).join(', ')}));

        ALTER TABLE media
        ADD CONSTRAINT media_status_check
        CHECK (status IN (${MEDIA_STATUSES.map((status) => `'${status}'`).join(', ')}));

        ALTER TABLE media
        ADD CONSTRAINT media_visibility_check
        CHECK (visibility IN (${MEDIA_VISIBILITIES.map((visibility) => `'${visibility}'`).join(', ')}));
    `);

    await knex.raw(`DROP INDEX IF EXISTS media_remote_id_is_used_index;`);

    await knex.schema.alterTable('media', (t) => {
        t.dropColumn('is_used');
        t.index(['status'], 'media_status_idx');
        t.index(['type'], 'media_type_idx');
        t.index(['user_id', 'status'], 'media_user_status_idx');
        t.index(['remote_id'], 'media_remote_id_idx');
        t.index(['checksum'], 'media_checksum_idx');
        t.index(['deleted_at'], 'media_deleted_at_idx');
    });

    await knex.schema.alterTable('post_medias', (t) => {
        t.uuid('media_id').nullable().references('id').inTable('media').onDelete('SET NULL');
        t.index(['media_id'], 'post_medias_media_id_idx');
    });

    await knex.raw(`
        UPDATE post_medias
        SET media_id = media.id
        FROM media
        WHERE post_medias.media_id IS NULL
          AND post_medias.public_id = media.remote_id;
    `);

    await knex.schema.createTable('media_variants', (t) => {
        t.uuid('id').primary().defaultTo(knex.fn.uuid());
        t.uuid('media_id').notNullable().references('id').inTable('media').onDelete('CASCADE');
        t.string('variant').notNullable();
        t.string('url').notNullable();
        t.string('remote_id').nullable();
        t.string('mime_type').nullable();
        t.integer('width').nullable();
        t.integer('height').nullable();
        t.integer('duration_ms').nullable();
        t.integer('size').nullable();
        t.jsonb('metadata').nullable();
        t.timestamp('created_at').defaultTo(knex.fn.now());

        t.index(['media_id', 'variant'], 'media_variants_media_variant_idx');
    });

    await knex.raw(`
        ALTER TABLE media_variants
        ADD CONSTRAINT media_variants_variant_check
        CHECK (variant IN (${MEDIA_VARIANTS.map((variant) => `'${variant}'`).join(', ')}));
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists('media_variants');

    await knex.schema.alterTable('post_medias', (t) => {
        t.dropIndex(['media_id'], 'post_medias_media_id_idx');
        t.dropColumn('media_id');
    });

    await knex.schema.alterTable('media', (t) => {
        t.dropIndex(['deleted_at'], 'media_deleted_at_idx');
        t.dropIndex(['checksum'], 'media_checksum_idx');
        t.dropIndex(['remote_id'], 'media_remote_id_idx');
        t.dropIndex(['user_id', 'status'], 'media_user_status_idx');
        t.dropIndex(['type'], 'media_type_idx');
        t.dropIndex(['status'], 'media_status_idx');
    });

    await knex.raw(`
        ALTER TABLE media DROP CONSTRAINT IF EXISTS media_visibility_check;
        ALTER TABLE media DROP CONSTRAINT IF EXISTS media_status_check;
        ALTER TABLE media DROP CONSTRAINT IF EXISTS media_type_check;
    `);

    await knex.schema.alterTable('media', (t) => {
        t.boolean('is_used').notNullable().defaultTo(false);
        t.dropColumn('deleted_at');
        t.dropColumn('checksum');
        t.dropColumn('visibility');
        t.dropColumn('status');
        t.dropColumn('type');
        t.index(['remote_id', 'is_used']);
    });
}
