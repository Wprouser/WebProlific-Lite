BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Item] (
    [id] NVARCHAR(1000) NOT NULL,
    [outletId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000) NOT NULL,
    [sku] NVARCHAR(1000) NOT NULL,
    [barcode] NVARCHAR(1000),
    [unit] NVARCHAR(1000) NOT NULL,
    [minStock] DECIMAL(10,3) NOT NULL,
    [maxStock] DECIMAL(10,3) NOT NULL,
    [currentStock] DECIMAL(10,3) NOT NULL CONSTRAINT [Item_currentStock_df] DEFAULT 0,
    [shelfLifeDays] INT,
    [costPrice] DECIMAL(12,2) NOT NULL,
    [defaultSupplierId] NVARCHAR(1000),
    [storageLocation] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [Item_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Item_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Item_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Item_sku_key] UNIQUE NONCLUSTERED ([sku]),
    CONSTRAINT [Item_barcode_key] UNIQUE NONCLUSTERED ([barcode])
);

-- CreateTable
CREATE TABLE [dbo].[Category] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [outletId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [Category_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Category_name_outletId_key] UNIQUE NONCLUSTERED ([name],[outletId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Item_outletId_isActive_idx] ON [dbo].[Item]([outletId], [isActive]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Item_categoryId_idx] ON [dbo].[Item]([categoryId]);

-- AddForeignKey
ALTER TABLE [dbo].[Item] ADD CONSTRAINT [Item_outletId_fkey] FOREIGN KEY ([outletId]) REFERENCES [dbo].[Outlet]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Item] ADD CONSTRAINT [Item_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
