BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[StockTransfer] (
    [id] NVARCHAR(1000) NOT NULL,
    [sourceOutletId] NVARCHAR(1000) NOT NULL,
    [destOutletId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [StockTransfer_status_df] DEFAULT 'REQUESTED',
    [requestedById] NVARCHAR(1000) NOT NULL,
    [dispatchedById] NVARCHAR(1000),
    [receivedById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [StockTransfer_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [dispatchedAt] DATETIME2,
    [receivedAt] DATETIME2,
    [cancelledAt] DATETIME2,
    CONSTRAINT [StockTransfer_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TransferLine] (
    [id] NVARCHAR(1000) NOT NULL,
    [transferId] NVARCHAR(1000) NOT NULL,
    [itemId] NVARCHAR(1000) NOT NULL,
    [destItemId] NVARCHAR(1000) NOT NULL,
    [quantity] DECIMAL(10,3) NOT NULL,
    [actualReceivedQty] DECIMAL(10,3),
    [varianceFlagged] BIT NOT NULL CONSTRAINT [TransferLine_varianceFlagged_df] DEFAULT 0,
    CONSTRAINT [TransferLine_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockTransfer_sourceOutletId_status_idx] ON [dbo].[StockTransfer]([sourceOutletId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [StockTransfer_destOutletId_status_idx] ON [dbo].[StockTransfer]([destOutletId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransferLine_transferId_idx] ON [dbo].[TransferLine]([transferId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransferLine_itemId_idx] ON [dbo].[TransferLine]([itemId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransferLine_destItemId_idx] ON [dbo].[TransferLine]([destItemId]);

-- AddForeignKey
ALTER TABLE [dbo].[StockTransfer] ADD CONSTRAINT [StockTransfer_sourceOutletId_fkey] FOREIGN KEY ([sourceOutletId]) REFERENCES [dbo].[Outlet]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StockTransfer] ADD CONSTRAINT [StockTransfer_destOutletId_fkey] FOREIGN KEY ([destOutletId]) REFERENCES [dbo].[Outlet]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransferLine] ADD CONSTRAINT [TransferLine_transferId_fkey] FOREIGN KEY ([transferId]) REFERENCES [dbo].[StockTransfer]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransferLine] ADD CONSTRAINT [TransferLine_itemId_fkey] FOREIGN KEY ([itemId]) REFERENCES [dbo].[Item]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[TransferLine] ADD CONSTRAINT [TransferLine_destItemId_fkey] FOREIGN KEY ([destItemId]) REFERENCES [dbo].[Item]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

