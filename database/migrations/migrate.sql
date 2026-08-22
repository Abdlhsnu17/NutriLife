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
