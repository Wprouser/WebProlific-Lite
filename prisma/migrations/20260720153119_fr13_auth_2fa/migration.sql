BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [phone] NVARCHAR(1000),
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [preferredLanguage] NVARCHAR(1000) NOT NULL CONSTRAINT [User_preferredLanguage_df] DEFAULT 'en',
    [preferredCurrency] NVARCHAR(1000) NOT NULL CONSTRAINT [User_preferredCurrency_df] DEFAULT 'SAR',
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [lastLoginAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[TwoFactorAuth] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [isEnabled] BIT NOT NULL CONSTRAINT [TwoFactorAuth_isEnabled_df] DEFAULT 0,
    [method] NVARCHAR(1000) NOT NULL CONSTRAINT [TwoFactorAuth_method_df] DEFAULT 'TOTP',
    [totpSecret] NVARCHAR(1000),
    [enforcedByPolicy] BIT NOT NULL CONSTRAINT [TwoFactorAuth_enforcedByPolicy_df] DEFAULT 0,
    [enrolledAt] DATETIME2,
    CONSTRAINT [TwoFactorAuth_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TwoFactorAuth_userId_key] UNIQUE NONCLUSTERED ([userId])
);

-- CreateTable
CREATE TABLE [dbo].[TwoFactorBackupCode] (
    [id] NVARCHAR(1000) NOT NULL,
    [twoFactorAuthId] NVARCHAR(1000) NOT NULL,
    [codeHash] NVARCHAR(1000) NOT NULL,
    [usedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TwoFactorBackupCode_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TwoFactorBackupCode_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TwoFactorChallenge] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000),
    [method] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [attemptCount] INT NOT NULL CONSTRAINT [TwoFactorChallenge_attemptCount_df] DEFAULT 0,
    [consumedAt] DATETIME2,
    CONSTRAINT [TwoFactorChallenge_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TrustedDevice] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [deviceToken] NVARCHAR(1000) NOT NULL,
    [deviceLabel] NVARCHAR(1000),
    [expiresAt] DATETIME2 NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [TrustedDevice_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [TrustedDevice_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TrustedDevice_deviceToken_key] UNIQUE NONCLUSTERED ([deviceToken])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [deviceInfo] NVARCHAR(1000),
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[PasswordResetToken] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [usedAt] DATETIME2,
    CONSTRAINT [PasswordResetToken_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TwoFactorBackupCode_twoFactorAuthId_idx] ON [dbo].[TwoFactorBackupCode]([twoFactorAuthId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TwoFactorChallenge_userId_idx] ON [dbo].[TwoFactorChallenge]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [TrustedDevice_userId_idx] ON [dbo].[TrustedDevice]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_userId_idx] ON [dbo].[RefreshToken]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [PasswordResetToken_userId_idx] ON [dbo].[PasswordResetToken]([userId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [UserAccess_userId_idx] ON [dbo].[UserAccess]([userId]);

-- AddForeignKey
ALTER TABLE [dbo].[UserAccess] ADD CONSTRAINT [UserAccess_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TwoFactorAuth] ADD CONSTRAINT [TwoFactorAuth_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TwoFactorBackupCode] ADD CONSTRAINT [TwoFactorBackupCode_twoFactorAuthId_fkey] FOREIGN KEY ([twoFactorAuthId]) REFERENCES [dbo].[TwoFactorAuth]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TwoFactorChallenge] ADD CONSTRAINT [TwoFactorChallenge_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TrustedDevice] ADD CONSTRAINT [TrustedDevice_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[PasswordResetToken] ADD CONSTRAINT [PasswordResetToken_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
