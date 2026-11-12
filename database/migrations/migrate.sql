-- Jalankan file ini untuk volume MySQL yang sudah dibuat sebelum fitur log lengkap tersedia.

-- Authentication fields for database volumes created before login/reset existed.
-- MySQL does not support `ADD COLUMN IF NOT EXISTS`, so keep this migration
-- idempotent with an information_schema check.
SET @user_password_hash_exists = (
  SELECT COUNT(*)
  FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'User'
    AND `COLUMN_NAME` = 'passwordHash'
);
SET @user_password_hash_sql = IF(
  @user_password_hash_exists = 0,
  'ALTER TABLE `User` ADD COLUMN `passwordHash` VARCHAR(255) NULL AFTER `name`',
  'SELECT 1'
);
PREPARE user_password_hash_stmt FROM @user_password_hash_sql;
EXECUTE user_password_hash_stmt;
DEALLOCATE PREPARE user_password_hash_stmt;

SET @user_avatar_url_exists = (
  SELECT COUNT(*)
  FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'User'
    AND `COLUMN_NAME` = 'avatarUrl'
);
SET @user_avatar_url_sql = IF(
  @user_avatar_url_exists = 0,
  'ALTER TABLE `User` ADD COLUMN `avatarUrl` VARCHAR(1024) NULL AFTER `passwordHash`',
  'SELECT 1'
);
PREPARE user_avatar_url_stmt FROM @user_avatar_url_sql;
EXECUTE user_avatar_url_stmt;
DEALLOCATE PREPARE user_avatar_url_stmt;

CREATE TABLE IF NOT EXISTS `PasswordResetToken` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `tokenHash` CHAR(64) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `usedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `PasswordResetToken_tokenHash_key` (`tokenHash`),
  KEY `PasswordResetToken_userId_idx` (`userId`),
  KEY `PasswordResetToken_expiresAt_idx` (`expiresAt`),
  CONSTRAINT `PasswordResetToken_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `HealthGoal`
  MODIFY `type` ENUM('CALORIES', 'WATER', 'STEPS', 'WEIGHT', 'PROTEIN', 'CARBS', 'FAT') NOT NULL;

CREATE TABLE IF NOT EXISTS `WaterLog` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `amountMl` INT UNSIGNED NOT NULL,
  `loggedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `WaterLog_userId_loggedAt_idx` (`userId`, `loggedAt`),
  CONSTRAINT `WaterLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `WeightLog` (
  `id` VARCHAR(36) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `weight` DOUBLE UNSIGNED NOT NULL,
  `loggedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `WeightLog_userId_loggedAt_idx` (`userId`, `loggedAt`),
  CONSTRAINT `WeightLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Recipe` (
  `id` CHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `ingredients` LONGTEXT NOT NULL,
  `steps` LONGTEXT NOT NULL,
  `loves` INT UNSIGNED NOT NULL DEFAULT 0,
  `sourceUrl` VARCHAR(768) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `titleCleaned` VARCHAR(255) NOT NULL,
  `totalIngredients` INT UNSIGNED NOT NULL DEFAULT 0,
  `ingredientsCleaned` LONGTEXT NOT NULL,
  `totalSteps` INT UNSIGNED NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Recipe_sourceUrl_key` (`sourceUrl`),
  KEY `Recipe_titleCleaned_idx` (`titleCleaned`),
  KEY `Recipe_category_idx` (`category`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Sample recipes for local development. sourceUrl keeps this seed idempotent.
INSERT IGNORE INTO `Recipe` (`id`, `title`, `ingredients`, `steps`, `loves`, `sourceUrl`, `category`, `titleCleaned`, `totalIngredients`, `ingredientsCleaned`, `totalSteps`) VALUES
  (SHA2('nutrilife-dummy-recipe-nasi-goreng', 256), 'Nasi Goreng Sayur Sederhana', '2 piring nasi putih\n1 butir telur\n1 wortel kecil, potong dadu\n2 siung bawang putih, cincang\n1 sdm kecap manis\n1 sdm minyak', 'Panaskan minyak dan tumis bawang putih hingga harum.\nMasukkan wortel, masak hingga sedikit lunak.\nMasukkan telur lalu orak-arik.\nTambahkan nasi dan kecap, aduk rata hingga panas.', 12, 'https://nutrilife.local/recipes/nasi-goreng-sayur', 'Makanan utama', 'nasi goreng sayur sederhana', 6, 'nasi putih telur wortel bawang putih kecap manis minyak', 4),
  (SHA2('nutrilife-dummy-recipe-soto-ayam', 256), 'Soto Ayam Bening', '250 g dada ayam\n1 liter air\n2 siung bawang putih\n1 batang serai, memarkan\n1 ruas kunyit\n100 g tauge\n1 jeruk nipis', 'Rebus ayam hingga matang, simpan kaldunya.\nHaluskan bawang putih dan kunyit lalu tumis bersama serai.\nMasukkan bumbu tumis ke kaldu dan masak 10 menit.\nSuwir ayam, sajikan dengan tauge dan perasan jeruk nipis.', 18, 'https://nutrilife.local/recipes/soto-ayam-bening', 'Sup', 'soto ayam bening', 7, 'dada ayam air bawang putih serai kunyit tauge jeruk nipis', 4),
  (SHA2('nutrilife-dummy-recipe-tempe-panggang', 256), 'Tempe Panggang Madu', '200 g tempe, iris\n1 sdm kecap manis\n1 sdt madu\n1 siung bawang putih, haluskan\n1 sdt minyak', 'Campur kecap, madu, bawang putih, dan minyak.\nOleskan bumbu pada irisan tempe.\nPanggang tempe 8 menit setiap sisi hingga kecokelatan.', 9, 'https://nutrilife.local/recipes/tempe-panggang-madu', 'Lauk', 'tempe panggang madu', 5, 'tempe kecap manis madu bawang putih minyak', 3),
  (SHA2('nutrilife-dummy-recipe-capcay', 256), 'Capcay Tahu', '150 g tahu, potong dadu\n1 wortel, iris\n100 g brokoli\n1/2 bawang bombai\n2 siung bawang putih\n250 ml air\n1 sdt minyak', 'Panaskan minyak, tumis bawang bombai dan bawang putih.\nMasukkan wortel dan air, masak 3 menit.\nTambahkan brokoli dan tahu.\nMasak hingga sayuran matang tetapi tetap renyah.', 7, 'https://nutrilife.local/recipes/capcay-tahu', 'Sayuran', 'capcay tahu', 7, 'tahu wortel brokoli bawang bombai bawang putih air minyak', 4),
  (SHA2('nutrilife-dummy-recipe-smoothie-pisang', 256), 'Smoothie Pisang Yogurt', '1 buah pisang matang\n150 ml yogurt tawar\n100 ml susu\n1 sdm oat\nEs batu secukupnya', 'Kupas dan potong pisang.\nMasukkan pisang, yogurt, susu, oat, dan es ke blender.\nBlender hingga halus lalu sajikan segera.', 15, 'https://nutrilife.local/recipes/smoothie-pisang-yogurt', 'Minuman', 'smoothie pisang yogurt', 5, 'pisang yogurt tawar susu oat es batu', 3);

CREATE TABLE IF NOT EXISTS `NutritionItem` (
  `id` CHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `nameNormalized` VARCHAR(255) NOT NULL,
  `brand` VARCHAR(191) NOT NULL,
  `kind` ENUM('FOOD', 'DRINK') NOT NULL DEFAULT 'FOOD',
  `calories` INT UNSIGNED NOT NULL,
  `protein` DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  `carbs` DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  `fat` DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  `fiber` DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  `sugar` DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  `sodium` DOUBLE UNSIGNED NOT NULL DEFAULT 0,
  `source` VARCHAR(100) NOT NULL DEFAULT 'fastfood-nutrition',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `NutritionItem_nameNormalized_idx` (`nameNormalized`),
  KEY `NutritionItem_brand_idx` (`brand`),
  KEY `NutritionItem_kind_idx` (`kind`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `User` (`id`, `email`, `name`)
VALUES ('demo-user', 'andi@nutrilife.local', 'Andi Darmawan');

INSERT IGNORE INTO `HealthGoal` (`id`, `userId`, `type`, `target`, `unit`) VALUES
  ('goal-calories', 'demo-user', 'CALORIES', 1800, 'kkal'),
  ('goal-water', 'demo-user', 'WATER', 2500, 'ml'),
  ('goal-steps', 'demo-user', 'STEPS', 8000, 'langkah'),
  ('goal-weight', 'demo-user', 'WEIGHT', 65, 'kg'),
  ('goal-protein', 'demo-user', 'PROTEIN', 120, 'g'),
  ('goal-carbs', 'demo-user', 'CARBS', 220, 'g'),
  ('goal-fat', 'demo-user', 'FAT', 60, 'g');

INSERT IGNORE INTO `WeightLog` (`id`, `userId`, `weight`, `loggedAt`) VALUES
  ('weight-demo-previous', 'demo-user', 69.0, DATE_SUB(NOW(), INTERVAL 7 DAY)),
  ('weight-demo-current', 'demo-user', 68.4, NOW());

-- Article CRUD for database volumes created before the article feature existed.
CREATE TABLE IF NOT EXISTS `Article` (
  `id` VARCHAR(36) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NULL,
  `excerpt` VARCHAR(512) NULL,
  `content` LONGTEXT NOT NULL,
  `imageUrl` VARCHAR(1024) NULL,
  `timeToRead` VARCHAR(32) NULL,
  `isNews` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `Article_slug_key` (`slug`),
  KEY `Article_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- MySQL does not support `ADD COLUMN IF NOT EXISTS`. Use a prepared statement
-- so this migration remains safe for both old and newly initialized volumes.
SET @article_image_url_exists = (
  SELECT COUNT(*)
  FROM `information_schema`.`COLUMNS`
  WHERE `TABLE_SCHEMA` = DATABASE()
    AND `TABLE_NAME` = 'Article'
    AND `COLUMN_NAME` = 'imageUrl'
);
SET @article_image_url_sql = IF(
  @article_image_url_exists = 0,
  'ALTER TABLE `Article` ADD COLUMN `imageUrl` VARCHAR(1024) NULL AFTER `content`',
  'SELECT 1'
);
PREPARE article_image_url_stmt FROM @article_image_url_sql;
EXECUTE article_image_url_stmt;
DEALLOCATE PREPARE article_image_url_stmt;

CREATE TABLE IF NOT EXISTS `Notification` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `imageUrl` VARCHAR(1024) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `Notification_createdAt_idx` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `Article` (`id`, `slug`, `title`, `category`, `excerpt`, `content`, `imageUrl`, `timeToRead`, `isNews`) VALUES
  ('art-1', 'piring-makan-seimbang', 'Cara menyusun piring makan yang seimbang', 'Nutrisi', 'Panduan sederhana membagi porsi karbohidrat, protein, sayur, dan buah.', 'Isi lengkap artikel: Bagaimana menyusun piring makan seimbang dengan proporsi karbohidrat, protein, sayur, dan buah.', NULL, '5 menit', 0),
  ('art-2', 'jalan-kaki-manfaat-besar', 'Jalan kaki: kebiasaan kecil dengan manfaat besar', 'Kebugaran', 'Mulai aktif tanpa perlengkapan khusus dan capai target langkah harianmu.', 'Isi lengkap artikel: Manfaat jalan kaki harian, panduan memulai, dan cara mengukur kemajuan.', NULL, '4 menit', 0),
  ('art-3', 'tanda-butuh-air', 'Tanda tubuh membutuhkan lebih banyak air', 'Hidrasi', 'Kenali sinyal dehidrasi dan bangun rutinitas minum yang konsisten.', 'Isi lengkap artikel: Gejala awal dehidrasi, tips meningkatkan asupan cairan, dan rekomendasi minum harian.', NULL, '3 menit', 0),
  ('news-1', 'peluncuran-fitur-pelacakan-resep', 'Peluncuran fitur pelacakan resep', 'Resep', 'Kini NutriLife mendukung impor resep untuk pencatatan yang lebih mudah.', 'Pengumuman: Fitur impor resep sekarang tersedia untuk pencatatan makanan.', NULL, NULL, 1),
  ('news-2', 'pembaruan-data-nutrisi', 'Pembaruan data nutrisi untuk makanan lokal', 'Makanan', 'Dataset nutrisi diperbarui dengan lebih banyak produk lokal.', 'Pengumuman: Dataset nutrisi diperluas agar pencarian lebih akurat.', NULL, NULL, 1),
  ('news-3', 'ide-sarapan-tinggi-protein', 'Ide sarapan tinggi protein yang praktis', 'Makanan', 'Pilihan sarapan sederhana untuk membantu memenuhi kebutuhan protein harian.', 'Telur, yogurt, tempe, dan oatmeal dapat diolah menjadi sarapan praktis yang kaya protein. Sesuaikan porsinya dengan kebutuhan energi dan lengkapi dengan buah atau sayuran.', NULL, '4 menit', 1),
  ('news-4', 'resep-smoothie-buah-segar', 'Resep smoothie buah segar tanpa gula tambahan', 'Resep', 'Perpaduan buah, yogurt, dan biji-bijian untuk minuman yang segar dan mengenyangkan.', 'Blender pisang, buah beri, yogurt tawar, air secukupnya, dan satu sendok chia seed hingga halus. Gunakan buah matang agar tetap manis tanpa gula tambahan.', NULL, '3 menit', 1);

UPDATE `Article` SET `category` = 'Resep' WHERE `slug` = 'peluncuran-fitur-pelacakan-resep' AND (`category` IS NULL OR `category` = '');
UPDATE `Article` SET `category` = 'Makanan' WHERE `slug` = 'pembaruan-data-nutrisi' AND (`category` IS NULL OR `category` = '');

-- Development administrator seed; change the password after first login.
INSERT INTO `User` (`id`, `email`, `name`, `passwordHash`, `role`)
VALUES (
  '00000000-0000-4000-8000-000000000001',
  'admin@nutrilife.com',
  'Admin NutriLife',
  'scrypt$bc38541def0cf34eeb7995cd071a61ed$80e56558053dbfee6ce85746c996514f94cff160eef11c09a0ff84859083b2fe1221349bdfe6c11d1fa8a67fb2b9ff1107fec2abfdf56c50824919c6f0a3f167',
  'ADMIN'
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `passwordHash` = VALUES(`passwordHash`),
  `role` = 'ADMIN';
