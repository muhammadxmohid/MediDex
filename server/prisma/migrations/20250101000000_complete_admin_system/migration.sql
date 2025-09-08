-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum  
DO $$ BEGIN
    CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable User
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL DEFAULT 'demo123',
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable Medicine
CREATE TABLE IF NOT EXISTS "Medicine" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "stockCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable SystemSettings  
CREATE TABLE IF NOT EXISTS "SystemSettings" (
    "id" TEXT NOT NULL DEFAULT uuid_generate_v4(),
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,
    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

-- Add columns to Order table if they don't exist
DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN "status" "OrderStatus" NOT NULL DEFAULT 'RECEIVED';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN "assignedTo" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN "notes" TEXT;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Order" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Create indexes if they don't exist
DO $$ BEGIN
    CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

DO $$ BEGIN
    CREATE UNIQUE INDEX "Medicine_name_key" ON "Medicine"("name");
EXCEPTION
    WHEN duplicate_table THEN null;
END $$;

-- Add foreign key constraint
DO $$ BEGIN
    ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedTo_fkey" 
    FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;