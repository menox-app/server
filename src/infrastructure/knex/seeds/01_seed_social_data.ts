import { Knex } from "knex";
import { randomUUID } from "crypto";
import * as bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker"; // Import faker

export async function seed(knex: Knex): Promise<void> {
  // 1. Dọn dẹp dữ liệu
  await knex("post_medias").del();
  await knex("posts").del();
  await knex("users").del();

  const hashedPassword = await bcrypt.hash("password123", 10);
  const users:any = [];

  // 2. Tạo 10 User với tên và avatar thật
  for (let i = 0; i < 10; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    users.push({
      id: randomUUID(),
      email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      username: faker.internet.username({ firstName, lastName }).toLowerCase(),
      display_name: faker.person.fullName({ firstName, lastName }),
      password_hash: hashedPassword,
      avatar_url: faker.image.avatar(), // Ảnh avatar người thật
      is_active: true,
      updated_at: new Date(),
    });
  }
  await knex("users").insert(users);

  const allPosts:any = [];
  const allMedias:any = [];

  // 3. Tạo bài đăng với nội dung đa dạng
  for (const user of users) {
    const postCount = faker.number.int({ min: 2, max: 4 });
    
    for (let j = 0; j < postCount; j++) {
      const postId = randomUUID();
      
      // Tạo nội dung "Deep" hoặc "Daily life"
      const content = faker.helpers.arrayElement([
        faker.lorem.paragraph(),
        faker.hacker.phrase(),
        `I feel ${faker.word.adjective()} at ${faker.location.city()}!`,
        faker.lorem.sentence(10)
      ]);

      allPosts.push({
        id: postId,
        author_id: user.id,
        content: content,
        visibility: "public",
        created_at: faker.date.recent({ days: 10 }), // Bài đăng trong vòng 10 ngày qua
      });

      // Ngẫu nhiên thêm 1-3 ảnh đẹp từ Unsplash qua Faker
      if (faker.datatype.boolean(0.8)) { // 80% bài đăng có ảnh
        const mediaCount = faker.number.int({ min: 1, max: 2 });
        for (let k = 0; k < mediaCount; k++) {
          allMedias.push({
            id: randomUUID(),
            post_id: postId,
            url: faker.image.urlLoremFlickr({ category: 'nature,city,lifestyle' }),
            type: "image",
            created_at: new Date(),
          });
        }
      }
    }
  }

  await knex.batchInsert("posts", allPosts);
  await knex.batchInsert("post_medias", allMedias);

  console.log(`🚀 Generate data success!`);
};
