BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[AuditLog] ADD [severity] NVARCHAR(1000);

-- CreateTable
CREATE TABLE [dbo].[StockTransaction] (
    [id] NVARCHAR(1000) NOT NULL,
    [outletId] NVARCHAR(1000) NOT NULL,
    [itemId] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(10,3) NOT NULL,
    [balanceAfter] DECIMAL(10,3) NOT NULL,
    [referenceType] NVARCHAR(1000),
    [referenceId] NVARCHAR(1000),
    [reasonCode] NVARCHAR(1000),
    [photoUrl] NVARCHAR(1000),
    [performedById] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [StockTransaction_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [StockTransaction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockTransaction_itemId_createdAt_idx] ON [dbo].[StockTransaction]([itemId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockTransaction_outletId_type_idx] ON [dbo].[StockTransaction]([outletId], [type]);

-- AddForeignKey
ALTER TABLE [dbo].[StockTransaction] ADD CONSTRAINT [StockTransaction_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[Item]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
