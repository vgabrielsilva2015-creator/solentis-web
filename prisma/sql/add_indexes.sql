-- Índices otimizados (aditivos, seguros para rodar várias vezes)

-- Leituras e Análises: Filtros por período, tenant e parâmetro
CREATE INDEX IF NOT EXISTS idx_readings_tenant_parameter_created
ON "readings" ("tenant_id", "parameter_id", "created_at");

CREATE INDEX IF NOT EXISTS idx_analyses_tenant_parameter_collected
ON "analyses" ("tenant_id", "parameter_id", "collected_at");

CREATE INDEX IF NOT EXISTS idx_extanalyses_tenant_parameter_collected
ON "external_analyses" ("tenant_id", "parameter_id", "collected_at");

-- Controle de Estoque (Entradas e Saídas)
CREATE INDEX IF NOT EXISTS idx_stock_entry_tenant_product_date
ON "chemical_stock_entries" ("tenant_id", "product_id", "received_at");

CREATE INDEX IF NOT EXISTS idx_stock_exit_tenant_product_date
ON "chemical_stock_exits" ("tenant_id", "product_id", "used_at");
