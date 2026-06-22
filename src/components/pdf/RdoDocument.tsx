import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 15,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: '#0a86a0',
    padding: 5,
    borderRadius: 4,
    marginRight: 8,
  },
  logoText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 5,
  },
  metaText: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'right',
  },
  confidentialBadge: {
    color: '#ef4444',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    backgroundColor: '#f1f5f9',
    padding: 5,
  },
  table: {
    width: '100%',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRowStriped: {
    backgroundColor: '#f8fafc',
  },
  tableColHeader: {
    padding: 5,
    fontWeight: 'bold',
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
  },
  tableCol: {
    padding: 5,
  },
  textSmall: {
    fontSize: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  emptyState: {
    padding: 10,
    fontStyle: 'italic',
    color: '#94a3b8',
  }
});

export interface LeiturasData {
  time: string;
  parameter: string;
  value: number;
  unit: string;
  point: string;
}

export interface ConsumoData {
  product: string;
  quantity: number;
  unit: string;
}

export interface OcorrenciaData {
  time: string;
  description: string;
  severity: string;
}

export interface RdoDocumentProps {
  dateStr: string;
  generatedBy: string;
  tenantName?: string;
  leituras: LeiturasData[];
  consumos: ConsumoData[];
  ocorrencias: OcorrenciaData[];
}

export function RdoDocument({
  dateStr,
  generatedBy,
  tenantName = "Planta Principal",
  leituras,
  consumos,
  ocorrencias,
}: RdoDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <View style={styles.logoContainer}>
              <Image src="/icon.png" style={{ width: 28, height: 28, marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0f172a' }}>SOLENTIS</Text>
            </View>
            <Text style={styles.title}>Relatório Diário de Operação (RDO)</Text>
            <Text style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>Unidade: {tenantName}</Text>
          </View>
          <View>
            <Text style={styles.confidentialBadge}>Confidencial / Uso Interno</Text>
            <Text style={styles.metaText}>Data Base: {dateStr}</Text>
            <Text style={styles.metaText}>Gerado em: {new Date().toLocaleDateString('pt-BR')} {new Date().toLocaleTimeString('pt-BR')}</Text>
            <Text style={styles.metaText}>Gerado por: {generatedBy}</Text>
          </View>
        </View>

        {/* LEITURAS DE PARÂMETROS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Leituras de Parâmetros e Analítica</Text>
          {leituras.length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, { backgroundColor: '#e2e8f0' }]}>
                <Text style={[styles.tableColHeader, { width: '20%' }]}>Horário</Text>
                <Text style={[styles.tableColHeader, { width: '30%' }]}>Ponto de Coleta</Text>
                <Text style={[styles.tableColHeader, { width: '30%' }]}>Parâmetro</Text>
                <Text style={[styles.tableColHeader, { width: '20%', textAlign: 'right' }]}>Valor</Text>
              </View>
              {leituras.map((item, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowStriped : {}]}>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '20%' }]}>{item.time}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '30%' }]}>{item.point}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '30%' }]}>{item.parameter}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '20%', textAlign: 'right' }]}>
                    {item.value} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyState}>Nenhuma leitura registrada nesta data.</Text>
          )}
        </View>

        {/* CONSUMO QUÍMICO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Consumo de Produtos Químicos</Text>
          {consumos.length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, { backgroundColor: '#e2e8f0' }]}>
                <Text style={[styles.tableColHeader, { width: '60%' }]}>Produto Químico</Text>
                <Text style={[styles.tableColHeader, { width: '40%', textAlign: 'right' }]}>Quantidade Utilizada</Text>
              </View>
              {consumos.map((item, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowStriped : {}]}>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '60%' }]}>{item.product}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '40%', textAlign: 'right', fontWeight: 'bold' }]}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyState}>Nenhum registro de saída de estoque para esta data.</Text>
          )}
        </View>

        {/* OCORRÊNCIAS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Ocorrências e Alertas (Abertas no dia)</Text>
          {ocorrencias.length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, { backgroundColor: '#e2e8f0' }]}>
                <Text style={[styles.tableColHeader, { width: '20%' }]}>Horário</Text>
                <Text style={[styles.tableColHeader, { width: '60%' }]}>Descrição</Text>
                <Text style={[styles.tableColHeader, { width: '20%' }]}>Criticidade</Text>
              </View>
              {ocorrencias.map((item, i) => (
                <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowStriped : {}]}>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '20%' }]}>{item.time}</Text>
                  <Text style={[styles.tableCol, styles.textSmall, { width: '60%' }]}>{item.description}</Text>
                  <Text style={[
                    styles.tableCol, styles.textSmall, { width: '20%', fontWeight: 'bold' },
                    item.severity === 'HIGH' || item.severity === 'CRITICAL' ? { color: '#ef4444' } : {}
                  ]}>
                    {item.severity}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyState}>Nenhuma ocorrência foi registrada nesta data.</Text>
          )}
        </View>

        {/* FOOTER */}
        <View style={styles.footer} fixed>
          <Text style={{ fontSize: 8, color: '#94a3b8' }}>Documento gerado automaticamente pelo sistema Solentis.</Text>
          <Text style={{ fontSize: 8, color: '#94a3b8' }} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
}
