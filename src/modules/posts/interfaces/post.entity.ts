export interface PostEntity {
    id: string;
    author_id: string;
    content: string | null;
    visibility: 'public' | 'private' | 'friends';
    created_at: Date;
    updated_at: Date;
}

export interface PostMediaEntity {
    id: string;
    post_id: string;
    url: string;
    public_id: string;
    type: 'image' | 'video';
    created_at: Date;
}
