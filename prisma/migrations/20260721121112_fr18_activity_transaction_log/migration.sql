BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[ActivityLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [chainId] NVARCHAR(1000),
    [propertyId] NVARCHAR(1000),
    [outletId] NVARCHAR(1000),
    [userId] NVARCHAR(1000),
    [category] NVARCHAR(1000) NOT NULL,
    [action] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000),
    [entityId] NVARCHAR(1000),
    [description] NVARCHAR(1000) NOT NULL,
    [metadata] NVARCHAR(1000),
    [ipAddress] NVARCHAR(1000),
    [deviceInfo] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ActivityLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ActivityLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TransactionLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [outletId] NVARCHAR(1000),
    [chainId] NVARCHAR(1000),
    [propertyId] NVARCHAR(1000),
    [entityCategory] NVARCHAR(1000) NOT NULL,
    [entityType] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000) NOT NULL,
    [operation] NVARCHAR(1000) NOT NULL,
    [fieldName] NVARCHAR(1000),
    [oldValue] NVARCHAR(1000),
    [newValue] NVARCHAR(1000),
    [valueAmount] DECIMAL(12,2),
    [currencyCode] NVARCHAR(1000),
    [performedById] NVARCHAR(1000),
    [summary] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TransactionLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TransactionLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_outletId_createdAt_idx] ON [dbo].[ActivityLog]([outletId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_chainId_createdAt_idx] ON [dbo].[ActivityLog]([chainId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_userId_createdAt_idx] ON [dbo].[ActivityLog]([userId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ActivityLog_category_createdAt_idx] ON [dbo].[ActivityLog]([category], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransactionLog_outletId_createdAt_idx] ON [dbo].[TransactionLog]([outletId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransactionLog_propertyId_createdAt_idx] ON [dbo].[TransactionLog]([propertyId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransactionLog_chainId_createdAt_idx] ON [dbo].[TransactionLog]([chainId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransactionLog_entityType_entityId_idx] ON [dbo].[TransactionLog]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TransactionLog_entityCategory_createdAt_idx] ON [dbo].[TransactionLog]([entityCategory], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[ActivityLog] ADD CONSTRAINT [ActivityLog_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TransactionLog] ADD CONSTRAINT [TransactionLog_performedById_fkey] FOREIGN KEY ([performedById]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
