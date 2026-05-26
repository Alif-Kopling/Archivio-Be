/*
  Warnings:

  - You are about to drop the column `approverId` on the `document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `document` DROP COLUMN `approverId`,
    ADD COLUMN `approvedByIds` VARCHAR(191) NULL,
    ADD COLUMN `approverIds` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'pending';
