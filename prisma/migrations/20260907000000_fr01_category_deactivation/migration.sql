BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Category] ADD [createdAt] DATETIME2 NOT NULL CONSTRAINT [Category_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
[isActive] BIT NOT NULL CONSTRAINT [Category_isActive_df] DEFAULT 1,
[updatedAt] DATETIME2 NOT NULL CONSTRAINT [Category_updatedAt_df] DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE NONCLUSTERED INDEX [Category_outletId_isActive_idx] ON [dbo].[Category]([outletId], [isActive]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

