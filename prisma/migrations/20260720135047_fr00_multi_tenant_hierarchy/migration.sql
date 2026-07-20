BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[Chain] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [baseCurrency] NVARCHAR(1000) NOT NULL CONSTRAINT [Chain_baseCurrency_df] DEFAULT 'SAR',
    [subscriptionPlan] NVARCHAR(1000) NOT NULL CONSTRAINT [Chain_subscriptionPlan_df] DEFAULT 'STANDARD',
    [isActive] BIT NOT NULL CONSTRAINT [Chain_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Chain_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Chain_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Property] (
    [id] NVARCHAR(1000) NOT NULL,
    [chainId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [address] NVARCHAR(1000),
    [timezone] NVARCHAR(1000) NOT NULL CONSTRAINT [Property_timezone_df] DEFAULT 'Asia/Riyadh',
    [isActive] BIT NOT NULL CONSTRAINT [Property_isActive_df] DEFAULT 1,
    CONSTRAINT [Property_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Outlet] (
    [id] NVARCHAR(1000) NOT NULL,
    [propertyId] NVARCHAR(1000) NOT NULL,
    [chainId] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [baseCurrency] NVARCHAR(1000) NOT NULL CONSTRAINT [Outlet_baseCurrency_df] DEFAULT 'SAR',
    [poApprovalThreshold] DECIMAL(12,2),
    [isActive] BIT NOT NULL CONSTRAINT [Outlet_isActive_df] DEFAULT 1,
    CONSTRAINT [Outlet_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[UserAccess] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [scopeType] NVARCHAR(1000) NOT NULL,
    [scopeId] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [UserAccess_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [UserAccess_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [UserAccess_userId_scopeType_scopeId_key] UNIQUE NONCLUSTERED ([userId],[scopeType],[scopeId])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Property_chainId_idx] ON [dbo].[Property]([chainId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Outlet_propertyId_idx] ON [dbo].[Outlet]([propertyId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Outlet_chainId_idx] ON [dbo].[Outlet]([chainId]);

-- AddForeignKey
ALTER TABLE [dbo].[Property] ADD CONSTRAINT [Property_chainId_fkey] FOREIGN KEY ([chainId]) REFERENCES [dbo].[Chain]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Outlet] ADD CONSTRAINT [Outlet_propertyId_fkey] FOREIGN KEY ([propertyId]) REFERENCES [dbo].[Property]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH

