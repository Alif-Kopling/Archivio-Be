-- AlterTable
ALTER TABLE `document` MODIFY `filePath` VARCHAR(191) NULL,
    MODIFY `storageType` VARCHAR(191) NOT NULL DEFAULT 'gdrive';
