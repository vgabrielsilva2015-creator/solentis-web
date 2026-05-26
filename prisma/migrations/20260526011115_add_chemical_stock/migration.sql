-- CreateTable
CREATE TABLE "chemical_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_stock" REAL NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "chemical_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_stock_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "supplier" TEXT,
    "invoice_number" TEXT,
    "notes" TEXT,
    "received_at" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_stock_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_stock_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "chemical_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_stock_entries_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_stock_exits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "notes" TEXT,
    "used_at" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_stock_exits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_stock_exits_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "chemical_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_stock_exits_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chemical_stock_counts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "counted_quantity" REAL NOT NULL,
    "notes" TEXT,
    "counted_at" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chemical_stock_counts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_stock_counts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "chemical_products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "chemical_stock_counts_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "chemical_products_tenant_id_is_active_idx" ON "chemical_products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "chemical_stock_entries_tenant_id_product_id_received_at_idx" ON "chemical_stock_entries"("tenant_id", "product_id", "received_at");

-- CreateIndex
CREATE INDEX "chemical_stock_exits_tenant_id_product_id_used_at_idx" ON "chemical_stock_exits"("tenant_id", "product_id", "used_at");

-- CreateIndex
CREATE INDEX "chemical_stock_counts_tenant_id_product_id_counted_at_idx" ON "chemical_stock_counts"("tenant_id", "product_id", "counted_at");
