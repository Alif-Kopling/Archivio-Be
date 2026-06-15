-- AlterTable
ALTER TABLE `document` ADD COLUMN `fileId` VARCHAR(191) NULL,
    ADD COLUMN `storageType` VARCHAR(191) NOT NULL DEFAULT 'local';
