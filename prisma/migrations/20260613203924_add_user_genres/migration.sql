-- AlterTable
ALTER TABLE "User" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[];
