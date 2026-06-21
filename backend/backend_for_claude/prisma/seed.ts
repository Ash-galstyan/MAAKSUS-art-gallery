// backend/prisma/seed.ts
/**
 * Seed script — populates the DB with enough data to develop against without
 * touching the admin UI. Idempotent: re-running upserts rather than blowing
 * up on existing rows.
 *
 *   npm run seed
 *
 * Creates:
 *   - 1 admin user (admin@gallery.local / admin12345)
 *   - 4 categories (paintings, prints, photography, drawings)
 *   - 3 artists with trilingual names + bios
 *   - 6 artworks with trilingual titles + descriptions, base prices in AMD
 *   - 4 print sizes (A4, A3, 50×70, 70×100)
 *   - 5 frame options (no frame, walnut wood, oak wood, black metal, white plastic)
 *
 * NOTE: artworks have no images attached. The Phase 3 image-processor needs
 * actual files on disk under UPLOAD_ROOT — out of scope for a seed script.
 * Upload images through /api/artworks/:id/images once the admin UI is built,
 * or call the endpoint directly via curl/Postman.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Seeding…');

  // ─── Admin user ─────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin12345', 12);
  await prisma.user.upsert({
    where: { email: 'admin@gallery.local' },
    update: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email: 'admin@gallery.local',
      passwordHash,
      firstName: 'Gallery',
      lastName: 'Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
      locale: 'EN',
    },
  });
  console.log('  admin user: admin@gallery.local / admin12345');

  // ─── Categories ─────────────────────────────────────────────────────────
  const categoryData = [
    {
      slug: 'paintings',
      translations: [
        { locale: 'EN', name: 'Paintings' },
        { locale: 'HY', name: 'Կտավներ' },
        { locale: 'RU', name: 'Картины' },
      ],
    },
    {
      slug: 'prints',
      translations: [
        { locale: 'EN', name: 'Prints' },
        { locale: 'HY', name: 'Տպագրություններ' },
        { locale: 'RU', name: 'Принты' },
      ],
    },
    {
      slug: 'photography',
      translations: [
        { locale: 'EN', name: 'Photography' },
        { locale: 'HY', name: 'Լուսանկարչություն' },
        { locale: 'RU', name: 'Фотография' },
      ],
    },
    {
      slug: 'drawings',
      translations: [
        { locale: 'EN', name: 'Drawings' },
        { locale: 'HY', name: 'Գծագրեր' },
        { locale: 'RU', name: 'Рисунки' },
      ],
    },
  ] as const;

  const categoriesByslug = new Map<string, string>();
  for (const cat of categoryData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: {
        slug: cat.slug,
        translations: { create: [...cat.translations] },
      },
    });
    categoriesByslug.set(cat.slug, created.id);
  }
  console.log(`  ${categoryData.length} categories`);

  // ─── Artists ────────────────────────────────────────────────────────────
  const artistData = [
    {
      slug: 'martiros-saryan',
      birthYear: 1880,
      deathYear: 1972,
      translations: [
        {
          locale: 'EN',
          name: 'Martiros Saryan',
          bio: 'Armenian painter whose vivid colour fields defined a national visual language in the 20th century.',
        },
        {
          locale: 'HY',
          name: 'Մարտիրոս Սարյան',
          bio: 'Հայ գեղանկարիչ, որի վառ գունային դաշտերը 20-րդ դարում սահմանեցին ազգային վիզուալ լեզու։',
        },
        {
          locale: 'RU',
          name: 'Мартирос Сарьян',
          bio: 'Армянский живописец, чьи яркие цветовые поля определили национальный визуальный язык XX века.',
        },
      ],
    },
    {
      slug: 'ani-petrosyan',
      birthYear: 1985,
      deathYear: null,
      translations: [
        {
          locale: 'EN',
          name: 'Ani Petrosyan',
          bio: 'Contemporary Armenian photographer working at the intersection of architecture and memory.',
        },
        {
          locale: 'HY',
          name: 'Անի Պետրոսյան',
          bio: 'Ժամանակակից հայ լուսանկարչուհի, ով աշխատում է ճարտարապետության և հիշողության խաչմերուկում։',
        },
        {
          locale: 'RU',
          name: 'Ани Петросян',
          bio: 'Современный армянский фотограф, работающий на стыке архитектуры и памяти.',
        },
      ],
    },
    {
      slug: 'davit-arzumanyan',
      birthYear: 1971,
      deathYear: null,
      translations: [
        {
          locale: 'EN',
          name: 'Davit Arzumanyan',
          bio: 'Yerevan-based printmaker whose limited-edition lithographs draw on Armenian folk motifs.',
        },
        {
          locale: 'HY',
          name: 'Դավիթ Արզումանյան',
          bio: 'Երևանաբնակ տպագիր արվեստագետ, որի սահմանափակ տպաքանակով լիտոգրաֆիաները հիմնված են հայկական ժողովրդական մոտիվների վրա։',
        },
        {
          locale: 'RU',
          name: 'Давид Арзуманян',
          bio: 'Ереванский печатник, чьи литографии ограниченным тиражом опираются на армянские народные мотивы.',
        },
      ],
    },
  ] as const;

  const artistsBySlug = new Map<string, string>();
  for (const a of artistData) {
    const created = await prisma.artist.upsert({
      where: { slug: a.slug },
      update: {
        birthYear: a.birthYear,
        deathYear: a.deathYear,
      },
      create: {
        slug: a.slug,
        birthYear: a.birthYear,
        deathYear: a.deathYear,
        translations: { create: [...a.translations] },
      },
    });
    artistsBySlug.set(a.slug, created.id);
  }
  console.log(`  ${artistData.length} artists`);

  // ─── Print sizes ────────────────────────────────────────────────────────
  const sizes = [
    {
      code: 'A4',
      widthCm: 21,
      heightCm: 29.7,
      priceMultiplier: 1.0,
      position: 0,
      translations: [
        { locale: 'EN', label: 'A4 (21 × 30 cm)' },
        { locale: 'HY', label: 'A4 (21 × 30 սմ)' },
        { locale: 'RU', label: 'A4 (21 × 30 см)' },
      ],
    },
    {
      code: 'A3',
      widthCm: 29.7,
      heightCm: 42,
      priceMultiplier: 1.5,
      position: 1,
      translations: [
        { locale: 'EN', label: 'A3 (30 × 42 cm)' },
        { locale: 'HY', label: 'A3 (30 × 42 սմ)' },
        { locale: 'RU', label: 'A3 (30 × 42 см)' },
      ],
    },
    {
      code: '50x70',
      widthCm: 50,
      heightCm: 70,
      priceMultiplier: 2.4,
      position: 2,
      translations: [
        { locale: 'EN', label: '50 × 70 cm' },
        { locale: 'HY', label: '50 × 70 սմ' },
        { locale: 'RU', label: '50 × 70 см' },
      ],
    },
    {
      code: '70x100',
      widthCm: 70,
      heightCm: 100,
      priceMultiplier: 3.6,
      position: 3,
      translations: [
        { locale: 'EN', label: '70 × 100 cm' },
        { locale: 'HY', label: '70 × 100 սմ' },
        { locale: 'RU', label: '70 × 100 см' },
      ],
    },
  ] as const;
  for (const s of sizes) {
    await prisma.printSize.upsert({
      where: { code: s.code },
      update: {
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        priceMultiplier: s.priceMultiplier,
        position: s.position,
        isActive: true,
      },
      create: {
        code: s.code,
        widthCm: s.widthCm,
        heightCm: s.heightCm,
        priceMultiplier: s.priceMultiplier,
        position: s.position,
        isActive: true,
        translations: { create: [...s.translations] },
      },
    });
  }
  console.log(`  ${sizes.length} print sizes`);

  // ─── Frame options ──────────────────────────────────────────────────────
  const frames = [
    {
      code: 'no-frame',
      frameType: 'NONE',
      colorHex: '#000000',
      additionalPrice: 0,
      position: 0,
      translations: [
        { locale: 'EN', label: 'No frame' },
        { locale: 'HY', label: 'Առանց շրջանակի' },
        { locale: 'RU', label: 'Без рамки' },
      ],
    },
    {
      code: 'walnut',
      frameType: 'WOOD',
      colorHex: '#6b4423',
      additionalPrice: 8000,
      position: 1,
      translations: [
        { locale: 'EN', label: 'Walnut wood' },
        { locale: 'HY', label: 'Ընկույզի փայտ' },
        { locale: 'RU', label: 'Грецкий орех' },
      ],
    },
    {
      code: 'oak',
      frameType: 'WOOD',
      colorHex: '#a87148',
      additionalPrice: 8000,
      position: 2,
      translations: [
        { locale: 'EN', label: 'Oak wood' },
        { locale: 'HY', label: 'Կաղնի' },
        { locale: 'RU', label: 'Дуб' },
      ],
    },
    {
      code: 'black-metal',
      frameType: 'METAL',
      colorHex: '#2b2b2b',
      additionalPrice: 6500,
      position: 3,
      translations: [
        { locale: 'EN', label: 'Black metal' },
        { locale: 'HY', label: 'Սև մետաղ' },
        { locale: 'RU', label: 'Чёрный металл' },
      ],
    },
    {
      code: 'white-plastic',
      frameType: 'PLASTIC',
      colorHex: '#ffffff',
      additionalPrice: 4000,
      position: 4,
      translations: [
        { locale: 'EN', label: 'White plastic' },
        { locale: 'HY', label: 'Սպիտակ պլաստիկ' },
        { locale: 'RU', label: 'Белый пластик' },
      ],
    },
  ] as const;
  for (const f of frames) {
    await prisma.frameOption.upsert({
      where: { code: f.code },
      update: {
        frameType: f.frameType,
        colorHex: f.colorHex,
        additionalPrice: f.additionalPrice,
        position: f.position,
        isActive: true,
      },
      create: {
        code: f.code,
        frameType: f.frameType,
        colorHex: f.colorHex,
        additionalPrice: f.additionalPrice,
        position: f.position,
        isActive: true,
        translations: { create: [...f.translations] },
      },
    });
  }
  console.log(`  ${frames.length} frame options`);

  // ─── Artworks ───────────────────────────────────────────────────────────
  const artworks = [
    {
      slug: 'mountains-of-armenia',
      artistSlug: 'martiros-saryan',
      categorySlug: 'paintings',
      year: 1923,
      medium: 'Oil on canvas',
      widthCm: 78,
      heightCm: 92,
      basePrice: 25000,
      translations: [
        {
          locale: 'EN',
          title: 'Mountains of Armenia',
          description: 'A landscape rendered in flat, saturated colour fields.',
          history: 'Painted shortly after Saryan returned to Armenia.',
        },
        {
          locale: 'HY',
          title: 'Հայաստանի լեռները',
          description: 'Բնանկար՝ ներկայացված հարթ, հագեցած գունային դաշտերով.',
          history: 'Նկարված է Սարյանի՝ Հայաստան վերադառնալուց կարճ ժամանակ անց.',
        },
        {
          locale: 'RU',
          title: 'Горы Армении',
          description: 'Пейзаж в плоских насыщенных цветовых полях.',
          history: 'Написан вскоре после возвращения Сарьяна в Армению.',
        },
      ],
    },
    {
      slug: 'still-life-with-pomegranates',
      artistSlug: 'martiros-saryan',
      categorySlug: 'paintings',
      year: 1929,
      medium: 'Oil on canvas',
      widthCm: 65,
      heightCm: 80,
      basePrice: 22000,
      translations: [
        {
          locale: 'EN',
          title: 'Still life with pomegranates',
          description: 'A composition centred on ripe pomegranates against deep blue.',
          history: null,
        },
        {
          locale: 'HY',
          title: 'Նատյուրմորտ նռներով',
          description: 'Կոմպոզիցիա՝ խորը կապույտի ֆոնին հասուն նռներով.',
          history: null,
        },
        {
          locale: 'RU',
          title: 'Натюрморт с гранатами',
          description: 'Композиция со спелыми гранатами на глубоком синем фоне.',
          history: null,
        },
      ],
    },
    {
      slug: 'kond-rooftops',
      artistSlug: 'ani-petrosyan',
      categorySlug: 'photography',
      year: 2022,
      medium: 'Archival pigment print',
      widthCm: 60,
      heightCm: 40,
      basePrice: 15000,
      translations: [
        {
          locale: 'EN',
          title: 'Kond rooftops',
          description: 'Tin roofs of the old Kond district at golden hour.',
          history: 'Shot during the photographer\'s 2022 series on disappearing Yerevan neighbourhoods.',
        },
        {
          locale: 'HY',
          title: 'Կոնդի տանիքները',
          description: 'Հին Կոնդ թաղամասի թիթեղյա տանիքները՝ ոսկեգույն ժամին.',
          history: 'Նկարահանվել է 2022-ին՝ լուսանկարչի՝ Երևանի անհետացող թաղամասերի շարքի ընթացքում.',
        },
        {
          locale: 'RU',
          title: 'Крыши Конда',
          description: 'Жестяные крыши старого района Конд в золотой час.',
          history: 'Снято в 2022 году в рамках серии об исчезающих кварталах Еревана.',
        },
      ],
    },
    {
      slug: 'cascade-staircase',
      artistSlug: 'ani-petrosyan',
      categorySlug: 'photography',
      year: 2023,
      medium: 'Archival pigment print',
      widthCm: 50,
      heightCm: 70,
      basePrice: 14000,
      translations: [
        {
          locale: 'EN',
          title: 'Cascade staircase',
          description: 'A long-exposure study of the Cascade complex at dusk.',
          history: null,
        },
        {
          locale: 'HY',
          title: 'Կասկադի աստիճանները',
          description: 'Կասկադ համալիրի երկար բացվածքով ուսումնասիրություն մթնշաղին.',
          history: null,
        },
        {
          locale: 'RU',
          title: 'Лестница Каскада',
          description: 'Этюд комплекса «Каскад» с длинной выдержкой в сумерках.',
          history: null,
        },
      ],
    },
    {
      slug: 'pomegranate-folk-motif',
      artistSlug: 'davit-arzumanyan',
      categorySlug: 'prints',
      year: 2021,
      medium: 'Lithograph, edition of 50',
      widthCm: 40,
      heightCm: 60,
      basePrice: 12000,
      translations: [
        {
          locale: 'EN',
          title: 'Pomegranate folk motif',
          description: 'A geometric study based on Armenian carpet motifs.',
          history: 'Part of a 50-print limited edition.',
        },
        {
          locale: 'HY',
          title: 'Նռան ժողովրդական մոտիվ',
          description: 'Երկրաչափական ուսումնասիրություն հայկական գորգերի մոտիվների հիման վրա.',
          history: '50 տպաքանակի սահմանափակ հրատարակության մաս.',
        },
        {
          locale: 'RU',
          title: 'Гранатовый народный мотив',
          description: 'Геометрический этюд по мотивам армянских ковров.',
          history: 'Часть ограниченного тиража из 50 экземпляров.',
        },
      ],
    },
    {
      slug: 'bird-letter-vortex',
      artistSlug: 'davit-arzumanyan',
      categorySlug: 'drawings',
      year: 2024,
      medium: 'Ink on paper',
      widthCm: 30,
      heightCm: 42,
      basePrice: 9000,
      translations: [
        {
          locale: 'EN',
          title: 'Bird-letter vortex',
          description: 'A spiralling composition of stylised Armenian bird-letters.',
          history: null,
        },
        {
          locale: 'HY',
          title: 'Թռչնագիր պարուրակ',
          description: 'Ոճավորված հայկական թռչնագրերի պարուրաձև կոմպոզիցիա.',
          history: null,
        },
        {
          locale: 'RU',
          title: 'Птицеписьменный вихрь',
          description: 'Спиральная композиция из стилизованных армянских птицеписьмен.',
          history: null,
        },
      ],
    },
  ] as const;

  for (const a of artworks) {
    const artistId = artistsBySlug.get(a.artistSlug);
    const categoryId = categoriesByslug.get(a.categorySlug);
    if (!artistId || !categoryId) {
      throw new Error(`Seed: missing artist or category for ${a.slug}`);
    }

    await prisma.artwork.upsert({
      where: { slug: a.slug },
      update: {
        artistId,
        categoryId,
        year: a.year,
        medium: a.medium,
        widthCm: a.widthCm,
        heightCm: a.heightCm,
        basePrice: a.basePrice,
        isAvailable: true,
        deletedAt: null,
      },
      create: {
        slug: a.slug,
        artistId,
        categoryId,
        year: a.year,
        medium: a.medium,
        widthCm: a.widthCm,
        heightCm: a.heightCm,
        basePrice: a.basePrice,
        isAvailable: true,
        translations: { create: [...a.translations] },
      },
    });
  }
  console.log(`  ${artworks.length} artworks (no images attached)`);

  console.log('Seed complete.');
}

main()
  .catch(async (err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
