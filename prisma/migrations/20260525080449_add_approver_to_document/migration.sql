-- CreateIndex
CREATE INDEX `Document_status_idx` ON `Document`(`status`);

-- CreateIndex
CREATE INDEX `Document_type_idx` ON `Document`(`type`);

-- CreateIndex
CREATE INDEX `Document_createdAt_idx` ON `Document`(`createdAt`);
