BEGIN TRY

BEGIN TRAN;

-- DropIndex
DROP INDEX [GRN_outletId_receivedAt_idx] ON [dbo].[GRN];

-- AlterTable: add the new columns nullable first so existing rows can be
-- backfilled from receivedById/receivedAt before either is made NOT NULL
-- or dropped.
ALTER TABLE [dbo].[GRN] ADD
[createdById] NVARCHAR(1000),
[createdAt] DATETIME2,
[postedById] NVARCHAR(1000),
[postedAt] DATETIME2,
[status] NVARCHAR(1000) NOT NULL CONSTRAINT [GRN_status_df] DEFAULT 'DRAFT';

-- Backfill via dynamic SQL: SQL Server resolves column names referenced in
-- a DML statement for the whole batch at parse time, before any statement
-- in the batch has actually executed — so a plain UPDATE here would fail to
-- see the columns the ALTER TABLE above just added, in this same batch.
-- EXEC(...) defers parsing of this statement to execution time, by which
-- point the ALTER has already run. Every pre-existing GRN was written under
-- the old immediate-post model, where creation and stock-posting happened
-- atomically in the same request — so for historical rows, both the
-- draft-creation and posting facts collapse onto the same original
-- receivedById/receivedAt values, and the row is already fully posted.
EXEC('UPDATE [dbo].[GRN] SET [createdById] = [receivedById], [createdAt] = [receivedAt], [postedById] = [receivedById], [postedAt] = [receivedAt], [status] = ''POSTED''');

EXEC('ALTER TABLE [dbo].[GRN] ALTER COLUMN [createdById] NVARCHAR(1000) NOT NULL');
EXEC('ALTER TABLE [dbo].[GRN] ALTER COLUMN [createdAt] DATETIME2 NOT NULL');
ALTER TABLE [dbo].[GRN] ADD CONSTRAINT [GRN_createdAt_df] DEFAULT CURRENT_TIMESTAMP FOR [createdAt];

ALTER TABLE [dbo].[GRN] DROP CONSTRAINT [GRN_receivedAt_df];
EXEC('ALTER TABLE [dbo].[GRN] DROP COLUMN [receivedAt], [receivedById]');

-- CreateIndex
CREATE NONCLUSTERED INDEX [GRN_outletId_createdAt_idx] ON [dbo].[GRN]([outletId], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [GRN_outletId_status_idx] ON [dbo].[GRN]([outletId], [status]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
