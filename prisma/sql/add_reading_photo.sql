-- Feature: foto opcional na leitura de campo (uma por Reading).
-- Aplicado de forma ADITIVA (não usar `prisma migrate dev` — resetaria o banco,
-- pois o histórico de migrations do repo está incompleto).
-- Rodar: npx prisma db execute --file prisma/sql/add_reading_photo.sql --schema prisma/schema.prisma
ALTER TABLE "readings" ADD COLUMN IF NOT EXISTS "photo_filename" TEXT;
