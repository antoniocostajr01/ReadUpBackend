-- AlterTable: add userId and rename readingTimeMinutes -> readingTimeSeconds
ALTER TABLE "ReadingSession" ADD COLUMN     "userId" TEXT NOT NULL;
ALTER TABLE "ReadingSession" RENAME COLUMN "readingTimeMinutes" TO "readingTimeSeconds";

-- Recreate Book FK with ON DELETE CASCADE so deleting a book removes its sessions
ALTER TABLE "ReadingSession" DROP CONSTRAINT "ReadingSession_bookId_fkey";
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add User FK
ALTER TABLE "ReadingSession" ADD CONSTRAINT "ReadingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
