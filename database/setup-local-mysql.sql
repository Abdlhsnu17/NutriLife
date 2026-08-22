-- Run this with a local MySQL admin account before using NutriLife on port 3306.
-- Example: mysql -u root -p < database/setup-local-mysql.sql

CREATE DATABASE IF NOT EXISTS `nutrilife`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'nutrilife'@'localhost'
  IDENTIFIED BY 'nutrilife';

CREATE USER IF NOT EXISTS 'nutrilife'@'127.0.0.1'
  IDENTIFIED BY 'nutrilife';

ALTER USER 'nutrilife'@'localhost'
  IDENTIFIED BY 'nutrilife';

ALTER USER 'nutrilife'@'127.0.0.1'
  IDENTIFIED BY 'nutrilife';

GRANT ALL PRIVILEGES ON `nutrilife`.* TO 'nutrilife'@'localhost';
GRANT ALL PRIVILEGES ON `nutrilife`.* TO 'nutrilife'@'127.0.0.1';

FLUSH PRIVILEGES;
